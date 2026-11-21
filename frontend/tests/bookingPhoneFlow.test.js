import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeContactPhone } from '../src/contactPhone.js'
import { confirmBookingWithSavedPhone, isPhoneNumberRequiredError, persistContactPhoneThenConfirm } from '../src/bookingPhoneFlow.js'

test('normalizes Jordanian and international phone numbers and rejects empty input', () => {
  assert.equal(normalizeContactPhone('+962 79 111 8877'), '+962791118877')
  assert.equal(normalizeContactPhone('079 111 8877'), '0791118877')
  assert.equal(normalizeContactPhone('+1 (202) 555-0182'), '+12025550182')
  assert.equal(normalizeContactPhone(''), '')
})

test('confirms only after the phone persistence step succeeds', async () => {
  const steps = []
  await persistContactPhoneThenConfirm(
    async (phone) => { steps.push(`saved:${phone}`) },
    async () => { steps.push('confirmed') },
    '+962791118877',
  )
  assert.deepEqual(steps, ['saved:+962791118877', 'confirmed'])
})

test('does not confirm when phone persistence fails', async () => {
  let confirmed = false
  await assert.rejects(
    persistContactPhoneThenConfirm(
      async () => { throw new Error('save failed') },
      async () => { confirmed = true },
      '+962791118877',
    ),
    /save failed/,
  )
  assert.equal(confirmed, false)
})

test('recognizes only the backend phone-required conflict contract', () => {
  assert.equal(isPhoneNumberRequiredError({
    response: { status: 409, data: { code: 'PHONE_NUMBER_REQUIRED' } },
  }), true)
  assert.equal(isPhoneNumberRequiredError({
    response: { status: 409, data: { code: 'SLOT_TAKEN' } },
  }), false)
  assert.equal(isPhoneNumberRequiredError({
    response: { status: 428, data: { code: 'PHONE_NUMBER_REQUIRED' } },
  }), false)
})

test('does not send a booking when the saved profile phone is null, empty, or whitespace', async () => {
  for (const phone of [null, '', ' \t\r\n']) {
    let requested = false
    let modalOpened = false
    const result = await confirmBookingWithSavedPhone(
      async () => ({ phone }),
      async () => { requested = true },
      () => { modalOpened = true },
    )
    assert.equal(result.phoneRequired, true)
    assert.equal(modalOpened, true)
    assert.equal(requested, false)
  }
})

test('sends the booking immediately when the authenticated profile already has a phone', async () => {
  let modalOpened = false
  let requested = false
  const result = await confirmBookingWithSavedPhone(
    async () => ({ phone: '+962791118877' }),
    async (profile) => {
      requested = profile.phone === '+962791118877'
      return { id: 12 }
    },
    () => { modalOpened = true },
  )
  assert.equal(result.phoneRequired, false)
  assert.equal(result.booking.id, 12)
  assert.equal(requested, true)
  assert.equal(modalOpened, false)
})

test('does not send the booking if the authenticated profile cannot be loaded', async () => {
  let requested = false
  await assert.rejects(confirmBookingWithSavedPhone(
    async () => { throw new Error('profile unavailable') },
    async () => { requested = true },
    () => {},
  ), /profile unavailable/)
  assert.equal(requested, false)
})
