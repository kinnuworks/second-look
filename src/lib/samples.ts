// Sample messages a visitor can try with one tap. The scam ones are written in
// the style of real scams that consumer-protection bodies have warned about;
// their links are illustrations and may not resolve. The genuine ones point at
// the companies' real websites.
export type Sample = { id: string; label: string; kind: "scam" | "genuine" | "test"; text: string };

export const SAMPLES: Sample[] = [
  {
    id: "parcel",
    label: "Parcel redelivery fee",
    kind: "scam",
    text: "Royal Mail: Your parcel is being held due to an unpaid shipping fee of £1.45. Pay within 24 hours or it will be returned to sender: https://royalmail-redelivery-uk.top/pay",
  },
  {
    id: "tax",
    label: "Tax refund",
    kind: "scam",
    text: "HMRC: You are eligible for a tax refund of £326.18. To claim, verify your details and card for payment by 11 Nov: https://hmrc-refund-claim.online/verify",
  },
  {
    id: "bank",
    label: "Bank 'new payee' alert",
    kind: "scam",
    text: "Barclays: A new payee was added to your account at 09:42. If this was NOT you, cancel it now at barclays-secure-cancel.com or call 0203 769 4410.",
  },
  {
    id: "hi-mum",
    label: "'Hi Mum' new number",
    kind: "scam",
    text: "Hi Mum, I dropped my phone in the sink so this is my new number. Can you do me a favour? I need to pay a bill today and my banking app won't work on this phone. Can you send £290 to my friend? I'll pay you back tomorrow x",
  },
  {
    id: "test-page",
    label: "Test: page with hidden AI instructions",
    kind: "test",
    text: "PayPal: Your account has been limited. Confirm your identity to restore access: https://{HOST}/test/limited-account",
  },
  {
    id: "real-delivery",
    label: "Real delivery update",
    kind: "genuine",
    text: "Royal Mail: Your item TT123456785GB will be delivered today between 09:30 and 13:30. Track it or change delivery at royalmail.com/track-your-item",
  },
  {
    id: "real-order",
    label: "Real order confirmation",
    kind: "genuine",
    text: "Amazon: Your order of 'Kindle Paperwhite' has been dispatched and arrives Thursday. Track your package at amazon.co.uk/gp/your-account/order-history",
  },
];
