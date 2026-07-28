import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  Building2,
  ClipboardCheck,
  FileText,
  HardHat,
  PackageCheck,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import styles from './landing.module.css'

const stageNav = ['01 capture', '02 assign', '03 prove', '04 pay']

const stages = [
  {
    number: '1.0',
    label: 'Capture · first call',
    title: 'Start with the lead, not a spreadsheet.',
    body: 'Put the contact, site, budget, scope notes, and next follow-up in one pipeline before the job turns into another tab in someone’s browser.',
    facts: ['Lead record', 'Contact details', 'Budget notes'],
    icon: UsersRound,
  },
  {
    number: '2.0',
    label: 'Assign · job setup',
    title: 'Turn accepted work into a job packet.',
    body: 'Move the bid into a project with tasks, files, milestones, team ownership, and the early documents the office will need later.',
    facts: ['Project tasks', 'Shared files', 'Milestones'],
    icon: ClipboardCheck,
  },
  {
    number: '3.0',
    label: 'Prove · vendor work',
    title: 'Give vendors a place to see their work.',
    body: 'Assign subcontractors, attach contracts, collect progress updates, and keep vendor communication connected to the job instead of buried in texts.',
    facts: ['Vendor portal', 'Contracts', 'Progress updates'],
    icon: HardHat,
  },
  {
    number: '4.0',
    label: 'Pay · closeout',
    title: 'Keep purchase orders and payments attached.',
    body: 'Track supplier pricing, purchase orders, task payments, contract payments, generated documents, and closeout records without hunting across folders.',
    facts: ['Purchase orders', 'Payments', 'Closeout docs'],
    icon: PackageCheck,
  },
]

const math = [
  ['4', 'operating stages from lead to payment.'],
  ['1', 'vendor portal for assigned work, contracts, and updates.'],
  ['0', 'placeholder customer counts or compliance claims on this page.'],
]

const plans = [
  {
    name: 'Trial',
    price: '$0',
    description: 'Explore the workflow, create sample jobs, and see how vendor records connect to project work.',
    action: 'Start free',
    href: '/register',
    features: ['Lead and project workspace', 'Vendor records', 'Document and task examples'],
  },
  {
    name: 'Team',
    price: 'Draft',
    description: 'Use once pricing, limits, and onboarding scope are confirmed. Keep this honest until the offer is final.',
    action: 'View demo',
    href: '/login',
    features: ['Vendor portal workflow', 'Purchase orders and payments', 'Client-facing project view'],
  },
]

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label="BuildFlo home">
          <span className={styles.brandIcon}>
            <Building2 aria-hidden="true" />
          </span>
          <span>BuildFlo</span>
        </Link>
        <nav className={styles.navLinks} aria-label="Primary navigation">
          <Link href="#method">Method</Link>
          <Link href="#math">Math</Link>
          <Link href="#plans">Plans</Link>
        </nav>
        <div className={styles.navActions}>
          <Link href="/login">Sign in</Link>
          <Link href="/register" className={styles.navButton}>Start free</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.stageRail} aria-label="BuildFlo workflow stages">
          {stageNav.map((stage) => (
            <span key={stage}>{stage}</span>
          ))}
        </div>

        <div className={styles.heroGrid}>
          <div>
            <p className={styles.kicker}>
              <ShieldCheck aria-hidden="true" />
              Construction CRM with vendor coordination built in
            </p>
            <h1>Every job, vendor, document, and payment in order.</h1>
            <p className={styles.heroText}>
              BuildFlo walks contractors from lead intake to project work, vendor updates,
              purchase orders, and closeout records — one stage at a time.
            </p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryButton}>
                Start the workflow <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="#method" className={styles.textLink}>See the four stages</Link>
            </div>
          </div>

          <aside className={styles.timerCard} aria-label="BuildFlo workflow preview">
            <p>BuildFlo · today</p>
            <strong>Brightline Electric uploaded progress photos.</strong>
            <span>
              Next: approve task payment, attach PO, notify the project manager.
            </span>
          </aside>
        </div>
      </section>

      <section id="method" className={styles.method}>
        <div className={styles.sectionIntro}>
          <h2>Four stages, from first call to final record.</h2>
          <p>
            The same operating loop every job. BuildFlo keeps the timeline, the vendor
            record, and the paperwork together so your team does not have to remember where everything lives.
          </p>
        </div>

        <ol className={styles.steps}>
          {stages.map((stage) => (
            <li key={stage.number} className={styles.step}>
              <div className={styles.stepNumber}>{stage.number}</div>
              <article className={styles.stepCard}>
                <div className={styles.stepCopy}>
                  <p>{stage.label}</p>
                  <h3>{stage.title}</h3>
                  <span>{stage.body}</span>
                </div>
                <div className={styles.stepPanel}>
                  <stage.icon aria-hidden="true" />
                  {stage.facts.map((fact) => (
                    <small key={fact}>{fact}</small>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section id="math" className={styles.math}>
        <div className={styles.sectionIntro}>
          <h2>Mostly, you stop chasing.</h2>
          <p>
            The product value is not a made-up percentage. It is the operating record:
            what came in, who owns it, what changed, and what still needs approval.
          </p>
        </div>
        <div className={styles.mathGrid}>
          {math.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.fieldNotes}>
        <div className={styles.sectionIntro}>
          <h2>What this replaces.</h2>
          <p>
            Not one more dashboard for its own sake. A calmer replacement for the daily
            mix of spreadsheets, shared drives, text threads, vendor calls, and payment follow-ups.
          </p>
        </div>
        <div className={styles.noteGrid}>
          <article>
            <BellRing aria-hidden="true" />
            <p>Follow-ups move from memory into assigned tasks and notifications.</p>
          </article>
          <article>
            <FileText aria-hidden="true" />
            <p>Contracts, generated documents, and attachments stay connected to the job.</p>
          </article>
          <article>
            <HardHat aria-hidden="true" />
            <p>Vendors see their work without getting access to internal budget fields.</p>
          </article>
        </div>
      </section>

      <section id="plans" className={styles.plans}>
        <div className={styles.sectionIntro}>
          <h2>Start small. Prove the workflow.</h2>
          <p>
            Keep the offer honest while pricing is finalized. The first conversion should
            get a contractor into a demo or trial, then validate which records matter most.
          </p>
        </div>
        <div className={styles.planGrid}>
          {plans.map((plan) => (
            <article key={plan.name} className={styles.planCard}>
              <div>
                <p>{plan.name}</p>
                <strong>{plan.price}</strong>
                <span>{plan.description}</span>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link href={plan.href} className={plan.name === 'Trial' ? styles.primaryButton : styles.secondaryButton}>
                {plan.action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Start at stage one.</h2>
        <p>Add a lead, connect a vendor, and watch the job record become easier to trust.</p>
        <div>
          <Link href="/register" className={styles.primaryButton}>
            Start the workflow <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/login" className={styles.textLink}>Open demo</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Contracting is messy. The record does not have to be.</p>
        <div className={styles.footerMeta}>
          <strong>BuildFlo</strong>
          <span>Remote · jobs everywhere</span>
          <nav aria-label="Footer navigation">
            <Link href="#method">Method</Link>
            <Link href="#plans">Plans</Link>
            <Link href="/login">Sign in</Link>
          </nav>
          <small>© 2026 BuildFlo · capture · assign · prove · pay</small>
        </div>
      </footer>
    </main>
  )
}
