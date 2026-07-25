# Button inventory

Every button label in the system, grouped by what the action *does*. The point
is to assign one colour per group, so the same action looks the same everywhere.

Agreed so far: **View = yellow · Edit = blue · Delete = red**, all with dark
(`#1F1F20`) text. Defined in `src/styles/buttons.ts`.

Mark up the groups below and I'll apply them page by page.

---

## 1. Destructive — proposed RED

| Label | Where |
|---|---|
| Delete | Content Management, Contract Set Up, Client Management, Equipment Management |
| Clear | Pricing Management |
| clear all | Dashboard |
| Deselect All | Equipment Popover |

## 2. Edit — proposed BLUE

| Label | Where |
|---|---|
| Edit | Client Management, Content Management |
| Edit hire dates | Hire Management |
| Update Client / Update Content / Update Equipment / Update Package / Update Quote | the Edit modals |
| Change Password | Profile, Client Profile, Client Change Password |
| Reset Password | Reset Password |

## 3. Main action / confirm — proposed YELLOW

Creating, saving, sending, starting. The one thing the screen is for.

| Label | Where |
|---|---|
| Save · Save Changes · Save changes · Save draft · Save Member · Save Quote · Save template | Hire Management, Maintenance, Company Details, Contract Set Up, Quote Management, modals |
| Add · Add Content · Add Equipment · + Add Company · + Add Period · Add first content · Add First Equipment | Content/Equipment Management, Client Management, Equipment Details |
| Create Package | Add Pricing Package modal |
| Apply · Apply to Equipment | Company Details, Custom Package modal |
| Assign | Client Management |
| Send · Send invite · Send anyway · Send Quote to Long Term Hire · Send Reset Instructions | Client Management, Quote modal, Forgot Password |
| Resend · Resend login | Client Management, Verify OTP |
| Login · Sign in · Proceed | Login, Client Login, Forgot Password, Verify OTP |
| Start Hire · Restart Hire | Hire Management |
| Log invoice | Hire Management |
| New contract | Contract Set Up |
| Report it | Client Faults |
| Request | Equipment Card, Equipment Quick View |
| Upload Image | Upload Test |
| Search | Client/Content/Equipment/Pricing Management |

## 4. View / open / reveal — proposed YELLOW (same as View)

| Label | Where |
|---|---|
| View | Client Management |
| Open | Faults |
| Details | Content Management |
| View schedule | Hire Management |
| View updates | Client Faults |
| View month-by-month breakdown | Client Hires |
| Download All (Zip) | Spec modal |
| Load More · Load More Messages | Client Dashboard, Chat |
| Retry | Content/Equipment Management, Dashboard, and others |

## 5. Dismiss / step back — proposed GREY BORDERED

Never coloured. These should never compete with the action beside them.

| Label | Where |
|---|---|
| Cancel | 11 places — every modal |
| Close | Faults, Quote modal, Spec modal, and others |
| Back · Back to Login · Back to Profile | Reset Password, Verify OTP, Forgot Password, Change Password |
| Hide · Hide breakdown | Hire Management, Client Faults, Client Hires |
| Logout | Client Dashboard, Client Profile |
| Forgot password? | Client Login |
| Attach file | Chat |

## 6. Busy states — no colour of their own

These replace the label on the button that was pressed, so they inherit its
colour and just show as disabled. Nothing to assign.

`Saving...` · `Sending...` · `Sending…` · `Searching...` · `Creating...` ·
`Starting...` · `Clearing...` · `Deleting…` · `Loading...` ·
`Loading equipment...`

---

## Questions worth settling

1. **Resend** — currently grey. It sends a real email and resets a password, so
   arguably yellow. Which?
2. **Search** and **Retry** — both are "do the thing" but appear constantly. All
   yellow might be noisy on a page with several.
3. **Logout** — grey feels right, but it's the one grey action that's
   irreversible in the moment.
4. **Rename for consistency?** There are three spellings of save
   (`Save Changes`, `Save changes`, `Save`) and five Update variants. Worth
   standardising the words as well as the colours.
