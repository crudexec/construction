import { expect, test } from '@playwright/test'
import { computeContractPayments, contractMaxPayment, type ContractPaymentLike } from '../src/lib/contracts/payment-calculations'
import { parseContractDetails, contractDuration } from '../src/lib/contracts/details'

const payment = (id: string, overrides: Partial<ContractPaymentLike> = {}): ContractPaymentLike => ({
  id, amount: 9000, amountApproved: 9000, paymentDate: `2026-0${id}-01`, createdAt: `2026-0${id}-01`,
  pmStatus: 'APPROVED', apStatus: 'PAID', lessRetention: 1000, ...overrides
})
test('max payment uses only contract value, approved changes and contract retention', () => {
  expect(contractMaxPayment(100000, 0, 10)).toBe(90000)
  expect(contractMaxPayment(100000, 20000, 10)).toBe(108000)
  expect(contractMaxPayment(0, 0, 10)).toBe(0)
  expect(contractMaxPayment(100, 0, 100)).toBe(0)
  expect(contractMaxPayment(100, -25, 0)).toBe(75)
  const computed = computeContractPayments([payment('1'), payment('2', { subtotal: 10, maxPayment: -12345 })], 100000, 20000, 10)
  expect(computed.map(p => p.maxPayment)).toEqual([108000, 108000])
})
test('retention before an application excludes itself, later applications and unpaid/voided rows', () => {
  const rows = [payment('1'), payment('2', { apStatus: 'VOID', lessRetention: 700 }), payment('3', { apStatus: 'PROCESSING', lessRetention: 800 }), payment('4'), payment('5')]
  const computed = computeContractPayments(rows, 100000, 0, 10)
  expect(computed.find(p => p.id === '1')?.previouslyWithheldRetention).toBe(0)
  expect(computed.find(p => p.id === '4')?.previouslyWithheldRetention).toBe(1000)
  expect(computed.find(p => p.id === '5')?.previouslyWithheldRetention).toBe(2000)
  expect(computed.find(p => p.id === '5')?.currentRetentionHeld).toBe(3000)
})
test('same-date ordering is deterministic and zero paid retention stays zero', () => {
  const rows = [payment('2', { paymentDate: '2026-01-01', createdAt: '2026-01-01', lessRetention: 0 }), payment('1')]
  const computed = computeContractPayments(rows, 100000, 0, 10)
  expect(computed.find(p => p.id === '2')?.previouslyWithheldRetention).toBe(1000)
  expect(computed.find(p => p.id === '2')?.currentRetentionHeld).toBe(1000)
})
test('contract edits preserve zero versus missing estimates and reject invalid dates/amounts', () => {
  const existing = { startDate: new Date('2026-01-01'), endDate: null }
  expect(parseContractDetails({ estimateAmount: 0 }, existing)).toEqual({ estimateAmount: 0 })
  expect(parseContractDetails({ estimateAmount: null }, existing)).toEqual({ estimateAmount: null })
  expect(parseContractDetails({ totalSum: 0 }, existing)).toEqual({ totalSum: 0, originalValueIsManual: true })
  for (const body of [{ startDate: '2026-02-30' }, { endDate: '2025-01-01' }, { retentionPercent: 101 }, { totalSum: -1 }, { totalSum: null }, { totalSum: '0' }, { currentContractValue: 7 }]) expect(() => parseContractDetails(body, existing)).toThrow()
  expect(contractDuration('2026-03-07', '2026-03-09')).toBe(2)
  expect(contractDuration('2026-01-01', null)).toBeNull()
})
