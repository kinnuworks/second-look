// A test page we host on purpose: an ordinary-looking parcel-fee scam page with no
// hidden instructions, so a check can read a live page through Otari's guardrail.
// It collects nothing: every field is disabled and the form has no action.
export const metadata = { title: "Test page (fake redelivery fee page)", robots: { index: false } };

export default function Page() {
  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <p style={{ background: "#fff3cd", padding: 12, border: "1px solid #e0c060" }}>
        Test page for Second Look. It imitates a parcel-fee scam page so the checker has a live page to read. Nothing typed here is sent anywhere.
      </p>
      <h1>We tried to deliver your parcel</h1>
      <p>Your parcel could not be delivered because a redelivery fee of £1.20 is unpaid. Pay within 24 hours to book a new delivery, or the parcel will be returned to the sender.</p>
      <form action={undefined}>
        <label>Full name<br /><input disabled placeholder="Name as on your card" /></label><br /><br />
        <label>Card number<br /><input disabled placeholder="1234 5678 9012 3456" /></label><br /><br />
        <label>Expiry and security code<br /><input disabled placeholder="MM/YY  CVV" /></label><br /><br />
        <button type="button" disabled>Pay £1.20 and rebook</button>
      </form>
    </main>
  );
}
