# LMNL.art Operating Language

## Identity and access

**HP-OS Sign-In Contract**:
The shared authentication contract owned by HP-OS and used by LMNL.art. Its initial methods are passwordless passkeys and verified email links. Google, Discord, Apple, and other identity-provider methods may be added later as approved methods within this same contract; they are not LMNL-specific authentication exceptions.
_Avoid_: Separate LMNL login system, social-login exception

**LMNL Membership**:
The LMNL-specific membership, profile, consent, and history boundary associated with a Person. It is distinct from shared sign-in and does not grant operator authority.
_Avoid_: Shared account, operator role

**LMNL Community Foundation**:
The initial community scope: LMNL Membership, a private member/artist profile, attendance history, and consented public event or community credits. It does not include a public member directory, collectibles, mutual links, access unlocks, rewards, points, internal currency, or crypto provenance; those require separate later product decisions.
_Avoid_: Social network, public artist directory by default

**LMNL Contribution**:
A voluntary monetary contribution to LMNL. It is a canonical money and finance outcome supported by Square payment evidence, but does not issue a ticket, Product, Membership entitlement, access right, reward, or other benefit unless a separately defined program explicitly does so.
_Avoid_: Ticket purchase, Product purchase, implicit membership payment

**LMNL Communications Consent**:
A person's explicit, revocable permission to receive LMNL marketing communications. It may exist without LMNL Membership and is distinct from authentication, event notices, purchase notices, and other transactional communications.
_Avoid_: Sign-in consent, ticket permission, implied marketing consent
