export async function persistContactPhoneThenConfirm(persistPhone, confirmBooking, phone) {
  await persistPhone(phone)
  return confirmBooking()
}

export async function confirmBookingWithSavedPhone(loadProfile, createBooking, onPhoneRequired) {
  const profile = await loadProfile()
  if (typeof profile?.phone !== 'string' || !profile.phone.trim()) {
    onPhoneRequired()
    return { phoneRequired: true }
  }

  return { phoneRequired: false, profile, booking: await createBooking(profile) }
}

export function isPhoneNumberRequiredError(error) {
  return error?.response?.status === 409
    && error?.response?.data?.code === 'PHONE_NUMBER_REQUIRED'
}
