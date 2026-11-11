import { test } from "node:test";
import assert from "node:assert/strict";
import { maskMessage } from "../src/lib/mask";
import { compareDomains, registrableDomain, hostOf } from "../src/lib/domains";
import { scoreLocally, scoreScript, SCORE_WEIGHTS } from "../src/lib/score";
import { findLinks } from "../src/lib/pipeline";

test("masking keeps family words and evidence, hides names and card numbers", () => {
  assert.equal(maskMessage("Hi Mum, I dropped my phone").masked, "Hi Mum, I dropped my phone");
  const m = maskMessage("Dear John Smith, card 4111 1111 1111 1111 at https://bad.top/x call 0203 769 4410");
  assert.match(m.masked, /Dear \[name\]/);
  assert.match(m.masked, /\[card number\]/);
  assert.match(m.masked, /https:\/\/bad\.top\/x/);
  assert.match(m.masked, /0203 769 4410/);
});

test("domains: lookalikes, real sites, multi-part suffixes", () => {
  assert.equal(registrableDomain("track.royalmail.co.uk"), "royalmail.co.uk");
  assert.equal(hostOf("www.Example.com/path"), "example.com");
  const fake = compareDomains("https://royalmail-redelivery-uk.top/pay", "royalmail.com");
  assert.equal(fake.same_site, false);
  assert.equal(fake.lookalike, true);
  const real = compareDomains("https://www.royalmail.com/track-your-item", "royalmail.com");
  assert.equal(real.same_site, true);
  assert.equal(real.lookalike, false);
  assert.equal(compareDomains("https://paypa1.com/login", "paypal.com").lookalike, true);
});

test("links are found with and without a scheme", () => {
  const links = findLinks("Track at royalmail.com/track-your-item or https://evil.top/x.");
  assert.ok(links.includes("https://royalmail.com/track-your-item"));
  assert.ok(links.includes("https://evil.top/x"));
});

test("score bands and the sandbox script use the same formula", () => {
  const scam = scoreLocally({ link_lookalike: true, domain_unregistered: true, asks_payment: true, urgency: true });
  assert.equal(scam.score, 70);
  assert.equal(scam.band, "likely_scam");
  const genuine = scoreLocally({ sender_matches_official: true, urgency: true });
  assert.equal(genuine.band, "looks_genuine");
  const script = scoreScript({ asks_payment: true });
  for (const [key, weight] of SCORE_WEIGHTS) assert.ok(script.includes(`("${key}", ${weight},`));
});
