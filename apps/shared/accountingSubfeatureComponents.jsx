/** @typedef {import('./accountingSubfeatures').SubFeatureGroup} SubFeatureGroup */
/** @typedef {import('./accountingSubfeatures').AccountingSubfeatureCatalog} AccountingSubfeatureCatalog */

/**
 * @typedef {Object} SubFeatureGridProps
 * @property {string} title
 * @property {SubFeatureGroup[]} groups
 */

/**
 * @param {SubFeatureGridProps} props
 */
export function SubFeatureGrid({ title, groups }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <div className="text-sm font-semibold text-slate-900 mb-3">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(groups || []).map((group) => (
          <div key={group.title} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">{group.title}</div>
            <ul className="list-disc pl-4 space-y-1">
              {(group.items || []).map((item) => (
                <li key={item} className="text-xs text-slate-600">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * @typedef {Object} AccountingSubFeatureCatalogProps
 * @property {AccountingSubfeatureCatalog} catalog
 * @property {string} [title]
 * @property {string} [description]
 * @property {'ap' | 'ar' | 'budgets'} [defaultOpenKey]
 */

/**
 * @param {AccountingSubFeatureCatalogProps} props
 */
export function AccountingSubFeatureCatalog({
  catalog,
  title = 'Accounting Sub-Feature Catalog',
  description = 'Reference view for AP, AR, and Budgeting scope under Finance.',
  defaultOpenKey = 'ap',
}) {
  const sections = [
    { key: 'ap', title: 'Accounts Payable', groups: catalog?.ap || [] },
    { key: 'ar', title: 'Accounts Receivable', groups: catalog?.ar || [] },
    { key: 'budgets', title: 'Budgets', groups: catalog?.budgets || [] },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 className="text-[14px] font-bold text-slate-900 mb-1">{title}</h2>
      <p className="text-[11px] text-slate-500 mb-3">{description}</p>
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {sections.map((section) => (
          <details key={section.key} className="rounded-lg border border-slate-200 bg-slate-50/40" open={section.key === defaultOpenKey}>
            <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-slate-800">{section.title}</summary>
            <div className="px-3 pb-3 space-y-2">
              {section.groups.map((group) => (
                <div key={group.title} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1">{group.title}</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {(group.items || []).map((item) => (
                      <li key={item} className="text-[11px] text-slate-600">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
