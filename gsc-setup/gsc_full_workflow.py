#!/usr/bin/env python3
"""
GSC Full Workflow — BDT Talent Group
- Adds site property to Google Search Console
- Gets DNS TXT verification token
- Submits sitemap once verified

Usage:
  1. Place credentials.json in this directory
  2. Run: python3 gsc_full_workflow.py
  3. Add the DNS TXT record shown to Porkbun
  4. Press ENTER when DNS is live (use: dig TXT bdttalentgroup.com to confirm)
  5. Script verifies and submits sitemap

DNS TXT Verification (no HTML changes needed):
  Host: @
  Value: google-site-verification=<token>
  TTL: 3600
"""

import os
import json
import sys
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

SCOPES = [
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/siteverification'
]

SITE_URL    = 'https://www.bdttalentgroup.com/'
SITEMAP_URL = 'https://www.bdttalentgroup.com/sitemap.xml'
TOKEN_FILE  = 'token.json'
CREDS_FILE  = 'credentials.json'

def authenticate():
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if creds and creds.valid:
            print("[AUTH] Using saved token.")
            return creds
    flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)
    with open(TOKEN_FILE, 'w') as f:
        f.write(creds.to_json())
    print("[AUTH] Authenticated and token saved.")
    return creds

def main():
    if not os.path.exists(CREDS_FILE):
        print(f"[ERROR] Missing {CREDS_FILE}")
        print("  1. Go to console.cloud.google.com")
        print("  2. Enable Search Console API + Site Verification API")
        print("  3. Create OAuth 2.0 Desktop App credentials")
        print(f"  4. Download as '{CREDS_FILE}' into this directory")
        sys.exit(1)

    creds = authenticate()
    gsc     = build('searchconsole', 'v1', credentials=creds)
    verif   = build('siteVerification', 'v1', credentials=creds)

    # Step 1: Add site property
    print(f"\n[1] Adding site property: {SITE_URL}")
    try:
        gsc.sites().add(siteUrl=SITE_URL).execute()
        print("    ✅ Site property added.")
    except Exception as e:
        print(f"    ℹ️  Already exists or error: {e}")

    # Step 2: Get DNS TXT verification token
    print(f"\n[2] Getting DNS TXT verification token...")
    token_resp = verif.webResource().getToken(body={
        "site": {"type": "SITE", "identifier": SITE_URL},
        "verificationMethod": "DNS_TXT"
    }).execute()
    token = token_resp['token']
    print(f"\n    ✅ Add this DNS TXT record to Porkbun:")
    print(f"    ┌─────────────────────────────────────────────────────┐")
    print(f"    │ Type:  TXT                                          │")
    print(f"    │ Host:  @                                            │")
    print(f"    │ Value: {token:<45} │")
    print(f"    │ TTL:   3600                                         │")
    print(f"    └─────────────────────────────────────────────────────┘")
    print(f"\n    Confirm it's live with: dig TXT bdttalentgroup.com +short")

    input("\n    Press ENTER after the TXT record is live and confirmed...")

    # Step 3: Trigger verification
    print(f"\n[3] Triggering DNS verification...")
    try:
        result = verif.webResource().insert(
            verificationMethod="DNS_TXT",
            body={"site": {"type": "SITE", "identifier": SITE_URL}}
        ).execute()
        print(f"    ✅ Verified! Resource ID: {result.get('id')}")
    except Exception as e:
        print(f"    ❌ Verification failed: {e}")
        print("    Check that the TXT record has propagated and try again.")
        sys.exit(1)

    # Step 4: Check permission level
    print(f"\n[4] Checking GSC permission level...")
    site_info = gsc.sites().get(siteUrl=SITE_URL).execute()
    level = site_info.get('permissionLevel', 'NONE')
    print(f"    Permission level: {level}")
    if level != 'siteOwner':
        print("    ⚠️  Not yet siteOwner — sitemap submission requires owner status.")
        sys.exit(1)

    # Step 5: Submit sitemap
    print(f"\n[5] Submitting sitemap: {SITEMAP_URL}")
    try:
        gsc.sitemaps().submit(siteUrl=SITE_URL, feedpath=SITEMAP_URL).execute()
        print("    ✅ Sitemap submitted!")
    except Exception as e:
        print(f"    ❌ Sitemap submission failed: {e}")
        print("    Note: You need a sitemap.xml at the site root first.")

    print("\n🎉 Done! Check GSC dashboard in 24-48h for indexing status.")
    print(f"   Spot-check: https://www.google.com/search?q=site:bdttalentgroup.com")

if __name__ == '__main__':
    main()
