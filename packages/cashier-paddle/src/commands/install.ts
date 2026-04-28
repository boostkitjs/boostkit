// `cashier:install` — publish schema + framework views into the app.
//
// The actual file copy is performed by `vendor:publish` in @rudderjs/rudder;
// this command just calls into it with the canonical tags.

export async function runInstall(): Promise<void> {
  // Lazy — `@rudderjs/rudder` is a peer-of-peer here.
  let runVendorPublish: (tag: string) => Promise<void>
  try {
    const mod = await import('@rudderjs/rudder' as string) as { runVendorPublish?: (tag: string) => Promise<void> }
    if (!mod.runVendorPublish) throw new Error('runVendorPublish not exported')
    runVendorPublish = mod.runVendorPublish
  } catch {
    console.log('  Run these commands to install cashier-paddle:')
    console.log('    pnpm rudder vendor:publish --tag=cashier-schema')
    console.log('    pnpm rudder vendor:publish --tag=cashier-views-react')
    console.log('    pnpm exec prisma generate')
    console.log('    pnpm exec prisma db push')
    return
  }

  await runVendorPublish('cashier-schema')
  // Default to React views — apps with vue/solid run the corresponding
  // vendor:publish manually.
  await runVendorPublish('cashier-views-react')

  console.log('  Cashier installed.')
  console.log('  Next steps:')
  console.log('    1. Add `Billable` to your User model: `class User extends Billable(Model) {}`')
  console.log('    2. Run `pnpm exec prisma generate && pnpm exec prisma db push`')
  console.log('    3. Set PADDLE_API_KEY, PADDLE_CLIENT_SIDE_TOKEN, PADDLE_WEBHOOK_SECRET in .env')
  console.log('    4. Mount the webhook: `registerCashierRoutes(Route)` in routes/web.ts')
}
