"""What a stay costs, night by night.

Pure functions. No database, no network, no clock — everything this module needs
arrives as an argument, so the whole engine is testable without infrastructure.
Reading it should be enough to know what a guest will be charged.

Two rules that are easy to get wrong and expensive to get wrong:

  * **Money is integer cents.** Never float. A rate is multiplied by whole nights
    and summed as integers, so the total is exact by construction rather than
    exact-looking.
  * **A stay covers the nights [check_in, check_out).** The check-out day is not
    billed. This is the same half-open range the database's EXCLUDE constraint
    uses, and the two must never disagree.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from stillnest.dates import nights


@dataclass(frozen=True, slots=True)
class PricingRule:
    """A seasonal override. `ends_on` is exclusive, like every range here."""

    starts_on: date
    ends_on: date
    price_cents: int
    min_nights: int | None = None
    label: str | None = None

    def covers(self, night: date) -> bool:
        return self.starts_on <= night < self.ends_on

    @property
    def span_days(self) -> int:
        return (self.ends_on - self.starts_on).days


@dataclass(frozen=True, slots=True)
class NightPrice:
    night: date
    price_cents: int
    rule_label: str | None


@dataclass(frozen=True, slots=True)
class Quote:
    nights: tuple[NightPrice, ...]
    subtotal_cents: int
    fees_cents: int
    total_cents: int
    """The minimum stay that actually applies — see `effective_min_nights`."""
    min_nights: int

    @property
    def night_count(self) -> int:
        return len(self.nights)


def rule_for(night: date, rules: tuple[PricingRule, ...]) -> PricingRule | None:
    """Which rule prices this night when several could.

    Overlapping seasons are a data-entry mistake, not a feature — but the engine
    still has to answer deterministically rather than depend on row order, or the
    same stay quotes differently on two requests.

    **The most specific rule wins**: shortest span first, then the later start.
    A one-week holiday override beats a three-month season covering it, which is
    what whoever entered them meant.
    """
    candidates = [r for r in rules if r.covers(night)]
    if not candidates:
        return None
    return min(candidates, key=lambda r: (r.span_days, -r.starts_on.toordinal()))


def effective_min_nights(
    check_in: date,
    check_out: date,
    base_min_nights: int,
    rules: tuple[PricingRule, ...],
) -> int:
    """The strictest minimum any night of the stay is subject to.

    A stay that touches deep winter takes deep winter's minimum, even if only one
    of its nights falls inside — the alternative would let a guest dodge the rule
    by starting a day early.
    """
    minimums = [base_min_nights]
    for night in nights(check_in, check_out):
        rule = rule_for(night, rules)
        if rule is not None and rule.min_nights is not None:
            minimums.append(rule.min_nights)
    return max(minimums)


def quote(
    check_in: date,
    check_out: date,
    base_price_cents: int,
    base_min_nights: int,
    rules: tuple[PricingRule, ...] = (),
    fees_cents: int = 0,
) -> Quote:
    """Price a stay night by night.

    Every night is priced independently, so a stay that crosses a season boundary
    is billed at each night's own rate rather than at whichever rate the first
    night happened to have.

    `fees_cents` is passed in rather than computed: Stillnest charges no fees
    today, and inventing one here would be inventing a business rule.
    """
    if base_price_cents < 0:
        raise ValueError("base_price_cents must not be negative")
    if fees_cents < 0:
        raise ValueError("fees_cents must not be negative")

    priced: list[NightPrice] = []
    for night in nights(check_in, check_out):
        rule = rule_for(night, rules)
        priced.append(
            NightPrice(
                night=night,
                price_cents=rule.price_cents if rule else base_price_cents,
                rule_label=rule.label if rule else None,
            )
        )

    subtotal = sum(n.price_cents for n in priced)

    return Quote(
        nights=tuple(priced),
        subtotal_cents=subtotal,
        fees_cents=fees_cents,
        total_cents=subtotal + fees_cents,
        min_nights=effective_min_nights(
            check_in, check_out, base_min_nights, rules
        ),
    )
