# Ask Zaen TestFlight setup

The GitHub Actions workflow uses the same manual-signing pipeline as the successful PreviewPort release:

1. Generate the Expo iOS project.
2. Resolve and cache Clerk/Nuke Swift packages.
3. Import an Apple Distribution certificate into a temporary keychain.
4. Install the Ask Zaen App Store provisioning profile.
5. Archive and export a manually signed IPA.
6. Upload the IPA with the existing App Store Connect API key.

## Required GitHub Actions secrets

Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `BUILD_CERTIFICATE_BASE64` | Base64-encoded Apple Distribution `.p12` file containing the private key |
| `P12_PASSWORD` | Password used when exporting the `.p12` file |
| `BUILD_PROVISION_PROFILE_BASE64` | Base64-encoded App Store provisioning profile for `com.asterius.askzaen` |
| `ASC_KEY_ID` | Existing App Store Connect API key ID |
| `ASC_ISSUER_ID` | Existing App Store Connect issuer ID |
| `ASC_PRIVATE_KEY` | Existing App Store Connect `.p8` private key contents |

`KEYCHAIN_PASSWORD` is optional. The workflow uses a temporary value when it is not supplied.

The certificate and provisioning profile must belong to the same Apple Developer team:

```text
Team ID: RRS43X8SMU
Bundle ID: com.asterius.askzaen
```

Do not commit `.p12`, `.mobileprovision`, `.p8`, or private-key files to the repository.

## Encode the signing files on Windows

Run these commands in PowerShell after exporting the files:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\AskZaen_Distribution.p12"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\AskZaen_AppStore.mobileprovision"))
```

Copy each complete output into its matching GitHub secret. The `.p12` must contain the private key; a `.cer` file by itself is not sufficient for CI signing.

## Run the workflow

The workflow runs manually from the Actions tab or automatically when a commit reaches `main` or a `v*` tag. It accepts an optional build number; otherwise it uses the GitHub run number.

The IPA is retained as a workflow artifact for 14 days. TestFlight processing can continue briefly after the upload step succeeds.
