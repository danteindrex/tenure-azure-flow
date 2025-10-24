export async function sendSms(to: string, body: string) {
  try {
    const resp = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, body })
    });

    return await resp.json();
  } catch (error) {
    console.error('Failed to call sendSms API', error);
    throw error;
  }
}
