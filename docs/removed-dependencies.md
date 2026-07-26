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

## Batch 2

The whole Uppy file-uploader suite. Uploads in this app go through
`equipmentApi.uploadFile` to S3; none of this was ever wired in.

| Package | Version | Why it was there |
|---|---|---|
| @uppy/core | ^3.7.1 | file uploader suite, never built |
| @uppy/dashboard | ^3.4.1 | file uploader suite, never built |
| @uppy/drag-drop | ^3.0.2 | file uploader suite, never built |
| @uppy/facebook | ^3.1.3 | file uploader suite, never built |
| @uppy/file-input | ^3.0.3 | file uploader suite, never built |
| @uppy/golden-retriever | ^3.1.0 | file uploader suite, never built |
| @uppy/google-drive | ^3.1.1 | file uploader suite, never built |
| @uppy/image-editor | ^2.1.2 | file uploader suite, never built |
| @uppy/instagram | ^3.1.3 | file uploader suite, never built |
| @uppy/onedrive | ^3.1.1 | file uploader suite, never built |
| @uppy/progress-bar | ^3.0.3 | file uploader suite, never built |
| @uppy/react | ^3.1.2 | file uploader suite, never built |
| @uppy/tus | ^3.4.0 | file uploader suite, never built |
| @uppy/webcam | ^3.3.1 | file uploader suite, never built |
| @uppy/xhr-upload | ^3.5.0 | file uploader suite, never built |
| uppy | ^3.20.0 | file uploader suite, never built |

## Batch 3

Calendars, a third UI library, two code editors and a page builder — all
template scaffolding.

| Package | Version | Why it was there |
|---|---|---|
| @craftjs/core | ^0.2.0-beta.11 | drag-and-drop page builder from the template |
| @fullcalendar/core | ^5.11.3 | calendar suite, never built |
| @fullcalendar/daygrid | ^5.11.3 | calendar suite, never built |
| @fullcalendar/interaction | ^5.11.3 | calendar suite, never built |
| @fullcalendar/list | ^5.11.3 | calendar suite, never built |
| @fullcalendar/react | ^5.11.2 | calendar suite, never built |
| @fullcalendar/timegrid | ^5.11.3 | calendar suite, never built |
| @mantine/core | ^6.0.19 | third UI library, app uses Tailwind |
| @mantine/hooks | ^6.0.19 | third UI library, app uses Tailwind |
| ace-builds | ^1.4.12 | code editor, never built |
| codemirror | ^5.65.16 | second code editor, never built |
| fullcalendar | ^5.11.3 | calendar suite, never built |
| react-ace | ^10.1.0 | code editor, never built |
| react-codemirror2 | ^7.3.0 | second code editor, never built |

## Batch 4

Charts, spreadsheets, carousels, drag-and-drop, rich text and assorted widgets.

`react-pdf` is not the same package as `@react-pdf/renderer`, which the contract
and quote PDFs use and which stays. `tw-elements` also stays — it is a plugin in
`tailwind.config.ts`.

| Package | Version | Why it was there |
|---|---|---|
| apexcharts | ^3.40.0 | template scaffolding, never imported |
| html-to-image | ^1.11.11 | template scaffolding, never imported |
| papaparse | ^5.4.1 | template scaffolding, never imported |
| pdfjs-dist | ^3.4.120 | template scaffolding, never imported |
| pretty-rating-react | ^2.2.0 | template scaffolding, never imported |
| qrcode | ^1.5.3 | template scaffolding, never imported |
| react-apexcharts | ^1.4.0 | template scaffolding, never imported |
| react-calendar | ^4.2.1 | template scaffolding, never imported |
| react-contenteditable | ^3.3.7 | template scaffolding, never imported |
| react-dnd | ^10.0.2 | template scaffolding, never imported |
| react-dnd-html5-backend | ^16.0.1 | template scaffolding, never imported |
| react-input-emoji | ^5.4.1 | template scaffolding, never imported |
| react-modern-calendar-datepicker | ^3.1.6 | template scaffolding, never imported |
| react-pdf | ^7.7.0 | template scaffolding, never imported |
| react-quill | ^2.0.0 | template scaffolding, never imported |
| redux | ^4.2.1 | template scaffolding, never imported |
| slick-carousel | ^1.8.1 | template scaffolding, never imported |
| swiper | ^9.3.1 | template scaffolding, never imported |
| xlsx | ^0.18.5 | template scaffolding, never imported |
