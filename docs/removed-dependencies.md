# Removed dependencies

Packages taken out of `package.json` because nothing in the codebase imports
them. They came with the original manaknight template. Nothing is lost — to
bring one back, `npm install name@version` using the version recorded here.

Each batch was checked two ways before removal: no import statement anywhere in
`src/`, and no mention of the package name in any file in the repo.

## Batch 1

| Package | Version | Why it was there |
|---|---|---|
| twilio-video | ^2.27.0 | video calling, never built |
| openai | ^4.24.1 | template scaffolding |
| @stripe/react-stripe-js | ^2.1.0 | payments, never built |
| @stripe/stripe-js | ^1.52.1 | payments, never built |
| @hotjar/browser | ^1.0.9 | tracking script already removed |
| qr-scanner | ^1.4.2 | template scaffolding |
| react-speech-recognition | ^3.10.0 | template scaffolding |
| @react-google-maps/api | ^2.19.2 | maps, never built |
| react-google-maps | ^9.4.5 | second maps library, never built |
| bootstrap | ^5.2.3 | competing CSS framework, app uses Tailwind |
| react-addons-update | ^15.6.3 | React 15 era, app is on React 18 |
| moment | ^2.29.4 | deprecated by its own maintainers |
