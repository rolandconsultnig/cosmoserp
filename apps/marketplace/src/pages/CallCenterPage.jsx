import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Headphones,
  HeartHandshake,
  LayoutGrid,
  MessagesSquare,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Workflow,
} from 'lucide-react';
import Seo from '../components/Seo';
import { getSiteUrl } from '../lib/siteConfig';

const METRICS = [
  { value: '24/7', label: 'Coverage options for high-demand operations' },
  { value: 'Omnichannel', label: 'Voice, WhatsApp, ticket, and callback flows' },
  { value: 'SLA-led', label: 'Response and resolution rules by queue' },
  { value: 'ERP-linked', label: 'Shared customer, invoice, and fulfillment context' },
];

const CAPABILITIES = [
  {
    icon: Headphones,
    title: 'Inbound customer care',
    copy: 'Manage enquiries, complaints, order follow-up, and after-sales support with trained scripts and disciplined escalation paths.',
  },
  {
    icon: PhoneCall,
    title: 'Outbound engagement',
    copy: 'Run lead qualification, collections reminders, onboarding calls, surveys, and reactivation campaigns with clear conversion tracking.',
  },
  {
    icon: Workflow,
    title: 'Workflow orchestration',
    copy: 'Tie support queues to dispatch, finance, field service, and back-office teams so nothing falls through a spreadsheet gap.',
  },
  {
    icon: BarChart3,
    title: 'Performance reporting',
    copy: 'Track service levels, queue pressure, AHT, first-contact resolution, QA scores, and actionable management trends.',
  },
  {
    icon: HeartHandshake,
    title: 'Retention and recovery',
    copy: 'Recover at-risk customers with structured callbacks, apology flows, service recovery playbooks, and case ownership.',
  },
  {
    icon: MessagesSquare,
    title: 'Brand-safe messaging',
    copy: 'Standardise call scripts, note-taking, tone, and supervisor review so every interaction sounds intentional and trustworthy.',
  },
];

const PACKAGES = [
  {
    title: 'Launch Desk',
    audience: 'For SMEs that need a reliable first layer of support',
    features: ['Inbound helpdesk setup', 'Business-hour coverage', 'Core call scripts and FAQs', 'Weekly reporting rhythm'],
    accent: 'bg-white text-slate-900',
  },
  {
    title: 'Growth Operations',
    audience: 'For teams managing higher ticket volume and customer retention',
    features: ['Inbound plus outbound campaigns', 'Escalation matrix and supervisor QA', 'CRM or Cosmos ERP workflow alignment', 'SLA dashboards and call quality scorecards'],
    accent: 'bg-[#123524] text-white',
  },
  {
    title: 'Enterprise Command',
    audience: 'For brands needing multi-team visibility and controlled scale',
    features: ['Extended-hour or 24/7 model design', 'Collections, onboarding, and service recovery queues', 'Dedicated reporting and governance cadence', 'Custom integration and operational playbooks'],
    accent: 'bg-[#6b1d1d] text-white',
  },
];

const PROCESS = [
  {
    icon: ClipboardList,
    title: 'Discovery and call-flow mapping',
    text: 'We document your customer journeys, queue types, exception cases, and operational bottlenecks before launch.',
  },
  {
    icon: LayoutGrid,
    title: 'Service design and training',
    text: 'Scripts, QA scorecards, escalation rules, coverage windows, and reporting lines are set up around your actual business model.',
  },
  {
    icon: Workflow,
    title: 'Go-live with connected operations',
    text: 'The desk launches with handoff rules to finance, logistics, sales, or field teams so issues move instead of stalling.',
  },
  {
    icon: TimerReset,
    title: 'Continuous optimisation',
    text: 'We refine based on queue data, complaint themes, conversion rates, and repeat-contact patterns so performance compounds.',
  },
];

const INDUSTRIES = [
  'Retail and ecommerce support desks',
  'Logistics coordination and delivery exception handling',
  'Healthcare and appointment follow-up operations',
  'School, training, and admissions enquiry management',
  'Financial collections and repayment reminder programs',
  'Hospitality and customer recovery teams',
];

const FAQS = [
  {
    question: 'Can the call center connect with Cosmos ERP?',
    answer: 'Yes. Roland Consult can align support operations with Cosmos ERP workflows so agents see relevant customer, order, invoice, and fulfillment context while teams across the business work from the same operational picture.',
  },
  {
    question: 'Do you only provide inbound support?',
    answer: 'No. The service can cover inbound helpdesk work, outbound sales or collections campaigns, onboarding calls, satisfaction surveys, and customer win-back programs.',
  },
  {
    question: 'Is this only for large companies?',
    answer: 'No. The model is structured in tiers so smaller businesses can start with a lean desk and expand into more advanced reporting, governance, and multichannel support when volume grows.',
  },
];

export default function CallCenterPage() {
  return (
    <div className="bg-[#f4efe6] text-slate-900">
      <Seo
        fullTitle="Call Center Services | Roland Consult Nigeria"
        description="Roland Consult Nigeria offers call center services for Nigerian businesses with inbound support, outbound engagement, service design, QA reporting, and Cosmos ERP-connected workflows."
        canonicalPath="/services/call-center"
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Call Center Services',
          provider: {
            '@type': 'Organization',
            name: 'Roland Consult Nigeria',
            url: getSiteUrl() || 'https://cosmoserp.com.ng',
          },
          areaServed: 'Nigeria',
          serviceType: 'Call Center and Customer Support Operations',
        }}
      />

      <section className="relative overflow-hidden bg-[#0f2e22] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_45%)]" />
        <div className="absolute -right-16 top-16 h-56 w-56 rounded-full border border-white/10 bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-40 w-full bg-[linear-gradient(to_top,rgba(0,0,0,0.18),transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
              <Headphones className="h-3.5 w-3.5" />
              Roland Consult Nigeria
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Build a customer contact operation that actually supports the business behind it.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50/92 sm:text-lg">
              Roland Consult Nigeria delivers call center services for businesses that need fast response, structured escalation, measurable service quality, and a cleaner handoff between customer care and operations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/erp/register"
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                Start service onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#service-packages"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                View service packages
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {METRICS.map((metric) => (
                <div key={metric.label} className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                  <div className="text-2xl font-black text-amber-200">{metric.value}</div>
                  <div className="mt-2 text-sm leading-6 text-white/78">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[30px] border border-white/12 bg-white/10 p-6 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                <Sparkles className="h-4 w-4" />
                Service snapshot
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-[#f4efe6] p-5 text-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a3412]">Managed support desk</div>
                      <div className="mt-2 text-2xl font-black leading-tight">Designed for response, retention, and operational visibility</div>
                    </div>
                    <BadgeCheck className="h-10 w-10 flex-shrink-0 text-[#123524]" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Clock3 className="h-5 w-5 text-amber-200" />
                    <div className="mt-3 text-sm font-bold">Coverage design</div>
                    <p className="mt-2 text-sm leading-6 text-white/72">Business-hour, extended-hour, or always-on support models based on queue demand.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    <div className="mt-3 text-sm font-bold">Governance built in</div>
                    <p className="mt-2 text-sm leading-6 text-white/72">Scripts, scorecards, supervisor review, and escalation rules from the start.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#11261f] p-5">
                  <div className="text-sm font-bold text-white">Best fit for</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['SMEs', 'Retail chains', 'Service businesses', 'Logistics teams', 'Collections units'].map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/82">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]">What We Deliver</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            A modern call center website and service proposition inside the Roland Consult ecosystem
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            This service page positions the call center as a real operating function, not a generic phone line. It speaks to outcomes leadership teams care about: customer confidence, cleaner execution, and measurable service control.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123524] text-amber-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#eadfce]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a3412]">Why Roland Consult</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Your customer conversations should connect to real operational action.</h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Roland Consult Nigeria structures people, process, reporting, and platform around your service reality. That means calls do not end as unresolved promises. They become tracked actions with accountability behind them.
            </p>

            <div className="mt-8 space-y-4">
              {[
                {
                  title: 'Operational alignment',
                  text: 'Agents, supervisors, and internal teams work with defined queue ownership, escalation rules, and expected turnaround windows.',
                },
                {
                  title: 'Management visibility',
                  text: 'Leadership gets a clearer view of recurring complaints, service delays, conversion gaps, and queue pressure before they become revenue problems.',
                },
                {
                  title: 'Customer trust',
                  text: 'Better scripts, better note capture, and better follow-through lead to stronger customer confidence and fewer repeat contacts.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[24px] bg-white/80 p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                  <div className="text-base font-bold text-slate-900">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] bg-[#18212f] p-7 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
              <Building2 className="h-4 w-4" />
              Sector fit
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {INDUSTRIES.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                    <span className="text-sm leading-6 text-white/88">{item}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-white/8 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <TimerReset className="h-4 w-4 text-amber-300" />
                Outcome focus
              </div>
              <p className="mt-2 text-sm leading-6 text-white/72">
                We frame the service around measurable management outcomes like service levels, recovery speed, conversion, complaint reduction, and customer satisfaction trends.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="service-packages" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]">Service Packages</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Choose the operating model that matches your current stage.</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Each package can be adapted around your queue mix, reporting needs, and whether you want support handled as a standalone desk or aligned with Cosmos ERP workflows.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <article key={pkg.title} className={`rounded-[30px] p-7 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${pkg.accent}`}>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300/90">{pkg.title}</div>
              <p className="mt-3 text-lg font-bold">{pkg.audience}</p>
              <ul className="mt-6 space-y-3">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#fff9f1]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a3412]">Rollout Process</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">How the call center goes from idea to dependable operation.</h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {PROCESS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[26px] border border-[#e7d8be] bg-white p-6 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6b1d1d] text-amber-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-[#6b1d1d] p-8 text-white shadow-[0_22px_55px_rgba(107,29,29,0.22)] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">Frequently Asked Questions</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Clear answers for teams considering a managed call center.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-rose-50/88">
                Most organisations are not looking for more noise. They want control, visibility, and a customer experience they can stand behind. These are the common questions we expect from decision-makers.
              </p>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-2xl bg-white/10 p-5">
                  <div className="text-base font-bold">{faq.question}</div>
                  <p className="mt-2 text-sm leading-6 text-rose-50/82">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/5 bg-[#123524]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 text-white sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Next Step</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Bring your customer support, callbacks, and escalations into one structured service operation.</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/84">
              If you want the call center to become part of the services offered by Roland Consult Nigeria, this page now gives you a strong public-facing entry point for that proposition.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/erp/register"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              Request onboarding
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Return to homepage
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
