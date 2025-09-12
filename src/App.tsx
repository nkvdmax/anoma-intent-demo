
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Lock, Route, ShieldCheck, Zap, Coins, BadgeCheck } from 'lucide-react'
import { motion } from 'framer-motion'

type Chain = 'Ethereum' | 'Base' | 'Arbitrum' | 'Polygon'
type Token = 'ETH' | 'USDC' | 'USDT' | 'DAI'

interface Intent {
  sender: string
  receiver: string
  amount: number
  srcChain: Chain
  srcToken: Token
  dstChain: Chain
  dstToken: Token
  maxSlippageBps: number
  deadlineSec: number
  preferFeeToken: Token
  privacy: boolean
  notes?: string
}

interface QuoteLeg {
  kind: 'swap' | 'bridge'
  chain: Chain
  fromToken?: Token
  toToken?: Token
  bridgeToChain?: Chain
  estIn: number
  estOut: number
  fee: number
  provider: string
}

interface QuotePlan {
  solver: string
  legs: QuoteLeg[]
  totalIn: number
  totalOut: number
  effectiveRate: number
  feesSummary: string
  etaSec: number
  privacySupported: boolean
  gasToken: Token
  atomic: boolean
  score: number
}

const CHAINS: Chain[] = ['Ethereum','Base','Arbitrum','Polygon']
const TOKENS: Token[] = ['ETH','USDC','USDT','DAI']

const MID_PRICE_USDC: Record<Token, number> = { ETH: 3200, USDC: 1, USDT: 1, DAI: 1 }
const CHAIN_LATENCY: Record<Chain, number> = { Ethereum: 50, Base: 20, Arbitrum: 25, Polygon: 15 }

const BRIDGES = [
  { name: 'ConnextX', chains: ['Ethereum','Base','Arbitrum','Polygon'] as Chain[], feeBps: 8, latency: 30 },
  { name: 'HyperLoop', chains: ['Ethereum','Base'] as Chain[], feeBps: 5, latency: 18 },
  { name: 'ZKPort', chains: ['Arbitrum','Polygon','Base'] as Chain[], feeBps: 6, latency: 16 },
]

const AMMS: Record<Chain, { name: string; feeBps: number }[]> = {
  Ethereum: [ { name: 'UniV3', feeBps: 6 }, { name: 'Sushi', feeBps: 25 } ],
  Base: [ { name: 'Aerodrome', feeBps: 8 }, { name: 'UniV3', feeBps: 6 } ],
  Arbitrum: [ { name: 'Camelot', feeBps: 10 }, { name: 'UniV3', feeBps: 6 } ],
  Polygon: [ { name: 'QuickSwap', feeBps: 24 }, { name: 'UniV3', feeBps: 6 } ],
}

function pct(bps: number) { return bps / 10_000 }

function applySwap(amount: number, from: Token, to: Token, feeBps: number) {
  const priceFrom = MID_PRICE_USDC[from]
  const priceTo = MID_PRICE_USDC[to]
  const usd = amount * priceFrom
  const fee = usd * pct(feeBps)
  const slippage = usd * pct(20)
  const outUsd = Math.max(usd - fee - slippage, 0)
  const out = outUsd / priceTo
  return { out, feeInSrc: fee / priceFrom }
}

function bestSwapOnChain(chain: Chain, amount: number, from: Token, to: Token): QuoteLeg {
  const candidates = AMMS[chain]
  let best: QuoteLeg | null = null
  for (const amm of candidates) {
    const { out, feeInSrc } = applySwap(amount, from, to, amm.feeBps)
    const leg: QuoteLeg = {
      kind: 'swap',
      chain,
      fromToken: from,
      toToken: to,
      estIn: amount,
      estOut: out,
      fee: feeInSrc,
      provider: `${amm.name}@${chain}`,
    }
    if (!best || leg.estOut > best.estOut) best = leg
  }
  return best!
}

function canBridge(a: Chain, b: Chain) {
  return BRIDGES.filter(br => br.chains.includes(a) && br.chains.includes(b))
}

function bestBridge(a: Chain, b: Chain, amount: number, token: Token): QuoteLeg | null {
  const routes = canBridge(a, b)
  if (!routes.length) return null
  let best: QuoteLeg | null = null
  for (const br of routes) {
    const fee = amount * pct(br.feeBps)
    const out = amount - fee
    const leg: QuoteLeg = {
      kind: 'bridge',
      chain: a,
      bridgeToChain: b,
      estIn: amount,
      estOut: out,
      fee,
      provider: `${br.name}`,
    }
    if (!best || leg.estOut > (best?.estOut ?? 0)) best = leg
  }
  return best
}

function solveIntent(intent: Intent): QuotePlan[] {
  const plans: QuotePlan[] = []
  const { srcChain, dstChain, srcToken, dstToken, amount, privacy, maxSlippageBps, preferFeeToken } = intent

  const scorePlan = (p: QuotePlan) => {
    const rateScore = p.effectiveRate * 1000
    const feePenalty = p.feesSummary.includes('high') ? -20 : 0
    const privacyBonus = privacy && p.privacySupported ? 15 : 0
    const latencyPenalty = Math.max(0, (p.etaSec - 45) / 5)
    return rateScore + privacyBonus - latencyPenalty + feePenalty
  }

  { // Strategy A: swap -> bridge
    let legs: QuoteLeg[] = []
    let curAmt = amount

    if (srcToken !== dstToken) {
      const swap1 = bestSwapOnChain(srcChain, curAmt, srcToken, dstToken)
      legs.push(swap1)
      curAmt = swap1.estOut
    }

    if (srcChain !== dstChain) {
      const bridge = bestBridge(srcChain, dstChain, curAmt, dstToken)
      if (bridge) { legs.push(bridge); curAmt = bridge.estOut } else { legs = [] }
    }

    const totalOut = curAmt
    if (legs.length) {
      const totalIn = amount
      const effRate = totalOut / totalIn
      const feesUsd = legs.reduce((s, l) => s + l.fee * MID_PRICE_USDC[l.fromToken || srcToken], 0)
      const feesGrade = feesUsd / (amount * MID_PRICE_USDC[srcToken]) > 0.004 ? 'high' : 'low'
      const eta = CHAIN_LATENCY[srcChain] + (srcChain !== dstChain ? CHAIN_LATENCY[dstChain] : 0)
      const plan: QuotePlan = { solver: 'RouteCraft v1', legs, totalIn, totalOut, effectiveRate: effRate, feesSummary: feesGrade, etaSec: eta, privacySupported: true, gasToken: preferFeeToken, atomic: true, score: 0 }
      plan.score = scorePlan(plan)
      plans.push(plan)
    }
  }

  { // Strategy B: bridge -> swap
    let legs: QuoteLeg[] = []
    let curAmt = amount

    if (srcChain !== dstChain) {
      const bridge = bestBridge(srcChain, dstChain, curAmt, srcToken)
      if (bridge) { legs.push(bridge); curAmt = bridge.estOut }
    }

    if (srcToken !== dstToken) {
      const swap2 = bestSwapOnChain(dstChain, curAmt, srcToken, dstToken)
      legs.push(swap2)
      curAmt = swap2.estOut
    }

    const totalOut = curAmt
    if (legs.length) {
      const totalIn = amount
      const effRate = totalOut / totalIn
      const feesUsd = legs.reduce((s, l) => s + l.fee * MID_PRICE_USDC[l.fromToken || srcToken], 0)
      const feesGrade = feesUsd / (amount * MID_PRICE_USDC[srcToken]) > 0.004 ? 'high' : 'low'
      const eta = CHAIN_LATENCY[srcChain] + (srcChain !== dstChain ? CHAIN_LATENCY[dstChain] : 0) - 4
      const plan: QuotePlan = { solver: 'TeleportX v2', legs, totalIn, totalOut, effectiveRate: effRate, feesSummary: feesGrade, etaSec: eta, privacySupported: dstChain !== 'Ethereum', gasToken: preferFeeToken, atomic: true, score: 0 }
      plan.score = scorePlan(plan)
      plans.push(plan)
    }
  }

  return plans
    .map(p => ({ ...p, score: p.score - (pct(maxSlippageBps) < pct(20) ? 5 : 0) }))
    .sort((a, b) => b.score - a.score)
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className='label'>{children}</div>
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{children}</div>
}

export default function App() {
  const [intent, setIntent] = useState<Intent>({
    sender: '@you',
    receiver: '@alice',
    amount: 100,
    srcChain: 'Ethereum',
    srcToken: 'USDC',
    dstChain: 'Base',
    dstToken: 'USDT',
    maxSlippageBps: 50,
    deadlineSec: 120,
    preferFeeToken: 'USDC',
    privacy: true,
    notes: 'Invoice #4821',
  })

  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<QuotePlan[]>([])
  const [selected, setSelected] = useState<number>(0)

  const best = plans[0]

  const recompute = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 450))
    const quotes = solveIntent(intent)
    setPlans(quotes)
    setSelected(0)
    setLoading(false)
  }

  const execute = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    alert('✅ Atomic settlement simulated. Receiver has funds on destination chain.')
  }

  const amountFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 })

  return (
    <div className='p-4 md:p-8 max-w-6xl mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl md:text-3xl font-semibold tracking-tight'>Intent‑Centric Payments (Prototype)</h1>
        <p className='text-slate-600 mt-1'>Сформулюйте намір — решту обчислить вирішувач. Без вибору ланцюга, без бриджів вручну.</p>
      </div>

      <Tabs defaultValue='compose'>
        <TabsList>
          <TabsTrigger value='compose'>Compose Intent</TabsTrigger>
          <TabsTrigger value='quotes'>Quotes</TabsTrigger>
          <TabsTrigger value='explain'>Explain</TabsTrigger>
        </TabsList>

        <TabsContent value='compose'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='flex items-center gap-2'><Zap className='h-5 w-5'/> Намір платежу</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Row>
                <div>
                  <FieldLabel>Відправник</FieldLabel>
                  <Input value={intent.sender} onChange={e => setIntent({ ...intent, sender: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Одержувач</FieldLabel>
                  <Input value={intent.receiver} onChange={e => setIntent({ ...intent, receiver: e.target.value })} />
                </div>
              </Row>
              <Row>
                <div>
                  <FieldLabel>Сума</FieldLabel>
                  <Input type='number' value={intent.amount} onChange={e => setIntent({ ...intent, amount: Number(e.target.value) })} />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <FieldLabel>Дедлайн (сек)</FieldLabel>
                    <Input type='number' value={intent.deadlineSec} onChange={e => setIntent({ ...intent, deadlineSec: Number(e.target.value) })} />
                  </div>
                  <div>
                    <FieldLabel>Макс. сліпедж (б.п.)</FieldLabel>
                    <Slider value={[intent.maxSlippageBps]} min={5} max={300} step={5} onValueChange={([v]) => setIntent({ ...intent, maxSlippageBps: Number(v) })} />
                    <div className='text-xs text-slate-600 mt-1'>{intent.maxSlippageBps} bps</div>
                  </div>
                </div>
              </Row>

              <Row>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <FieldLabel>Звідки (ланцюг)</FieldLabel>
                    <Select value={intent.srcChain} onValueChange={(v) => setIntent({ ...intent, srcChain: v as Chain })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CHAINS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Токен відправника</FieldLabel>
                    <Select value={intent.srcToken} onValueChange={(v) => setIntent({ ...intent, srcToken: v as Token })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TOKENS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <FieldLabel>Куди (ланцюг)</FieldLabel>
                    <Select value={intent.dstChain} onValueChange={(v) => setIntent({ ...intent, dstChain: v as Chain })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CHAINS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Токен одержувача</FieldLabel>
                    <Select value={intent.dstToken} onValueChange={(v) => setIntent({ ...intent, dstToken: v as Token })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TOKENS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </Row>

              <Row>
                <div className='flex items-center gap-2 p-3 rounded-xl border'>
                  <Checkbox checked={intent.privacy} onCheckedChange={(v) => setIntent({ ...intent, privacy: Boolean(v) })} />
                  <label className='text-sm flex items-center gap-2'><ShieldCheck className='h-4 w-4'/> Приватний розрахунок (ZK)</label>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <FieldLabel>Токен для комісій</FieldLabel>
                    <Select value={intent.preferFeeToken} onValueChange={(v) => setIntent({ ...intent, preferFeeToken: v as Token })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['ETH','USDC','USDT','DAI'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Нотатка (опц.)</FieldLabel>
                    <Input value={intent.notes} onChange={e => setIntent({ ...intent, notes: e.target.value })} />
                  </div>
                </div>
              </Row>

              <div className='flex items-center gap-3 pt-2'>
                <Button onClick={recompute} disabled={loading}>
                  {loading ? <Loader2 className='h-4 w-4 mr-2 animate-spin'/> : <Route className='h-4 w-4 mr-2'/>}
                  Знайти найкращий маршрут
                </Button>
                <span className='badge border-slate-200 bg-white rounded-xl'>без гаманця • без бриджів вручну</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='quotes'>
          {!plans.length ? (
            <Alert>
              <AlertTitle>Немає котирувань</AlertTitle>
              <AlertDescription>Спочатку згенеруйте котирування на вкладці "Compose Intent".</AlertDescription>
            </Alert>
          ) : (
            <div className='grid md:grid-cols-2 gap-4'>
              {plans.map((p, i) => (
                <div key={i} className={`cursor-pointer transition ${selected===i?'ring-2 ring-slate-300':''}`} onClick={() => setSelected(i)}>
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='flex items-center justify-between'>
                        <span className='flex items-center gap-2'><Coins className='h-5 w-5'/> {p.solver}</span>
                        <span className='badge border-slate-200 rounded-xl'>{p.privacySupported && intent.privacy ? 'ZK OK' : 'No ZK'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <div className='text-sm grid grid-cols-2 gap-2'>
                        <div>Вихід: <b>{amountFmt.format(p.totalOut)} {intent.dstToken}</b></div>
                        <div>Коефіцієнт: <b>{p.effectiveRate.toFixed(4)}</b></div>
                        <div>ETA: ~{p.etaSec}s</div>
                        <div>Комісії: {p.feesSummary}</div>
                        <div className='col-span-2'>Газ: {p.gasToken} • {p.atomic ? 'Atomic' : 'Best‑effort'}</div>
                      </div>
                      <div className='space-y-1 text-xs text-slate-600'>
                        {p.legs.map((l, idx) => (
                          <div key={idx} className='flex items-center gap-2'>
                            {l.kind === 'swap' ? <Zap className='h-3.5 w-3.5'/> : <Route className='h-3.5 w-3.5'/>}
                            <span>
                              {l.kind === 'swap' ? (
                                <>Swap on <b>{l.provider}</b>: {amountFmt.format(l.estIn)} {l.fromToken} → <b>{amountFmt.format(l.estOut)} {l.toToken}</b> (fee {amountFmt.format(l.fee)} {l.fromToken})</>
                              ) : (
                                <>Bridge via <b>{l.provider}</b>: {amountFmt.format(l.estIn)} {intent.dstToken} {(l.bridgeToChain)?`(${intent.srcChain} → ${l.bridgeToChain})`:''} → <b>{amountFmt.format(l.estOut)} {intent.dstToken}</b> (fee {amountFmt.format(l.fee)} {intent.dstToken})</>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {plans.length > 0 && (
            <div className='flex items-center gap-3 pt-4'>
              <Button onClick={execute} disabled={loading}>
                {loading ? <Loader2 className='h-4 w-4 mr-2 animate-spin'/> : <Lock className='h-4 w-4 mr-2'/>}
                Виконати атомарно
              </Button>
              <span className='badge border-slate-300 rounded-xl flex items-center gap-1'><BadgeCheck className='h-3.5 w-3.5'/> Дедлайн: {intent.deadlineSec}s • Сліпедж ≤ {intent.maxSlippageBps} bps</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value='explain'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='flex items-center gap-2'><ShieldCheck className='h-5 w-5'/> Як це змінює Web3 практики?</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-relaxed'>
              <ul className='list-disc pl-6 space-y-2'>
                <li><b>Нуль ручних бриджів:</b> користувач не обирає міст/шлях — лише намір. Вирішувачі знаходять найкращий план.</li>
                <li><b>Газ‑абстракція:</b> сплата комісій у вибраному токені, без поповнення gas‑коінів у кожному L2.</li>
                <li><b>Приватність за замовчуванням:</b> перемикач ZK вмикає захищений розрахунок; метадані мінімізуються.</li>
                <li><b>Атомарність між ланцюгами:</b> план виконується або цілком, або відхиляється — без часткових зависань активів.</li>
                <li><b>Ринок вирішувачів:</b> декілька конкурентних котирувань, що тисне на спреди.</li>
                <li><b>Політики та обмеження як перший клас:</b> дедлайни, сліпедж, вимоги до конфіденційності — це частина наміру.</li>
              </ul>
              <div className='alert border-slate-200'>
                <div className='font-semibold'>Примітка</div>
                <div className='text-sm text-slate-600'>Це прототип зі змодельованою ліквідністю/комісіями. Для продакшена підключіть адаптери до реальних DEX/мостів та ZK‑прувер, а також ринок зовнішніх вирішувачів.</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
