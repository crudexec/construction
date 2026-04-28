WITH company_user AS (
  SELECT
    u.id AS user_id,
    u."companyId" AS company_id
  FROM "User" u
  WHERE lower(u.email) = lower('bdeller@alliedconstruction.net')
)
UPDATE "DocumentTemplate" dt
SET "isDefault" = false
FROM company_user cu
WHERE dt."companyId" = cu.company_id
  AND dt.type = 'LIEN_RELEASE';

WITH company_user AS (
  SELECT
    u.id AS user_id,
    u."companyId" AS company_id
  FROM "User" u
  WHERE lower(u.email) = lower('bdeller@alliedconstruction.net')
)
INSERT INTO "DocumentTemplate" (
  id,
  "companyId",
  name,
  description,
  type,
  content,
  "isDefault",
  "isActive",
  "createdById",
  "createdAt",
  "updatedAt"
)
SELECT
  'tmpl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 21),
  cu.company_id,
  'Default Lien Release',
  'Default template for conditional and unconditional lien release generation',
  'LIEN_RELEASE',
  $template$
  <div style="font-family: Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.5;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
      <div>
        {{company.logo}}
        <div style="font-size: 18px; font-weight: 700; margin-top: 8px;">{{company.name}}</div>
        <div>{{company.address}}</div>
        <div>{{company.cityStateZip}}</div>
        <div>{{company.phone}}</div>
        <div>{{company.email}}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 700;">{{lienRelease.typeLabel}}</div>
        <div style="margin-top: 6px;">Status: {{lienRelease.status}}</div>
        <div>Generated: {{today}}</div>
      </div>
    </div>

    <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">Release Summary</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; width: 28%; color: #6b7280;">Release Title</td><td style="padding: 4px 0;">{{lienRelease.title}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Vendor</td><td style="padding: 4px 0;">{{vendor.companyName}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Project</td><td style="padding: 4px 0;">{{project.title}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Contract Number</td><td style="padding: 4px 0;">{{contract.number}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Amount Covered</td><td style="padding: 4px 0;">{{lienRelease.amount}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Through Date</td><td style="padding: 4px 0;">{{lienRelease.throughDate}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Effective Date</td><td style="padding: 4px 0;">{{lienRelease.effectiveDate}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">External Payment Ref</td><td style="padding: 4px 0;">{{lienRelease.externalPaymentRef}}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">External Source</td><td style="padding: 4px 0;">{{lienRelease.externalSource}}</td></tr>
      </table>
    </div>

    <p>
      The undersigned hereby acknowledges receipt of payment in the amount of <strong>{{lienRelease.amount}}</strong>
      for labor, services, equipment, or materials furnished in connection with <strong>{{project.title}}</strong>
      under Contract <strong>{{contract.number}}</strong>, through <strong>{{lienRelease.throughDate}}</strong>.
    </p>

    <p>
      In consideration of that payment, the undersigned releases any lien, stop notice, or bond right to the extent
      permitted by law for the amount identified above, subject to the terms applicable to this
      <strong>{{lienRelease.typeLabel}}</strong>.
    </p>

    <div style="margin: 18px 0; padding: 12px 14px; background: #f9fafb; border-left: 4px solid #0f766e;">
      <div style="font-weight: 600; margin-bottom: 6px;">Internal Notes</div>
      <div>{{lienRelease.notes}}</div>
    </div>

    <div style="margin-top: 28px;">
      <div style="margin-bottom: 24px;">
        <div style="border-bottom: 1px solid #111827; height: 24px;"></div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Authorized Signature</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div>
          <div style="border-bottom: 1px solid #111827; height: 24px;"></div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Printed Name</div>
        </div>
        <div>
          <div style="border-bottom: 1px solid #111827; height: 24px;"></div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Date Signed</div>
        </div>
      </div>
    </div>

    <div style="margin-top: 32px; font-size: 10px; color: #6b7280;">
      Requested by {{requestedBy.name}}. Approved by {{approvedBy.name}}.
    </div>
  </div>
  $template$,
  true,
  true,
  cu.user_id,
  now(),
  now()
FROM company_user cu;
