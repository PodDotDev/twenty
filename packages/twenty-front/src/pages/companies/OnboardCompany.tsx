import { styled } from '@linaria/react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { TextInput } from '@/ui/input/components/TextInput';
import { PageBody } from '@/ui/layout/page/components/PageBody';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { Button, Toggle } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type CompanyType = 'INSURANCE_PREMIUM' | 'ACCOUNTANCY_FEE' | 'LEGAL_FEE';

const POUND_TO_MICROS = 1_000_000;
const GBP = 'GBP';

const sanitizeNumeric = (input: string, allowDecimal: boolean) => {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!allowDecimal) return cleaned.replace(/\./g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
};

const formatPounds = (raw: string) => {
  if (raw === '' || raw === '.') return '';
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  const hasDecimal = raw.includes('.');
  return `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

const toCurrency = (pounds: string) => {
  if (pounds === '' || pounds == null) return undefined;
  const amount = Number(pounds);
  if (Number.isNaN(amount)) return undefined;
  return {
    amountMicros: Math.round(amount * POUND_TO_MICROS),
    currencyCode: GBP,
  };
};

const StyledPage = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledForm = styled.form`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  max-width: 560px;
  padding: ${themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledHeading = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledSubheading = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledFieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.label`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const StyledSelect = styled.select`
  appearance: none;
  background-color: ${themeCssVariables.background.transparent.lighter};
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-position: right ${themeCssVariables.spacing[2]} center;
  background-repeat: no-repeat;
  background-size: 16px;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  color-scheme: light dark;
  font-size: ${themeCssVariables.font.size.md};
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[8]} 0 ${themeCssVariables.spacing[2]};

  &:focus {
    border-color: ${themeCssVariables.border.color.blue};
    outline: none;
  }

  & option {
    background-color: ${themeCssVariables.background.secondary};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledNativeInput = styled.input`
  background-color: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  color-scheme: light dark;
  font-size: ${themeCssVariables.font.size.md};
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};

  &:focus {
    border-color: ${themeCssVariables.border.color.blue};
    outline: none;
  }
`;

const StyledToggleRow = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[1]} 0;
`;

const StyledSection = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  padding-top: ${themeCssVariables.spacing[5]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledActions = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding-top: ${themeCssVariables.spacing[4]};
`;

type CurrencyInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const CurrencyInput = ({ value, onChange, placeholder }: CurrencyInputProps) => {
  const [focused, setFocused] = useState(false);
  const display = focused ? value : formatPounds(value);

  return (
    <StyledNativeInput
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={focused ? placeholder ?? '0' : placeholder ?? '£0'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(sanitizeNumeric(e.target.value, true))}
    />
  );
};

type IntegerInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const IntegerInput = ({ value, onChange, placeholder }: IntegerInputProps) => (
  <StyledNativeInput
    type="text"
    inputMode="numeric"
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(sanitizeNumeric(e.target.value, false))}
  />
);

const toLinks = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return { primaryLinkUrl: trimmed, primaryLinkLabel: '' };
};

type FormState = {
  name: string;
  domainName: string;
  companyType: CompanyType | '';

  grossWrittenPremium: string;
  gwpFinanced: string;
  hasOtherFinanceFirm: boolean;
  otherFinanceFirm: string;
  otherFinanceFirmExclusive: boolean;
  otherFinanceFirmExclusiveUntil: string;
  usesActuris: boolean;

  feeIncome: string;
  partnerDirectorsCount: string;
  internationalNetwork: string;
  practiceManagementSoftware: string;
  generalLedgerSoftware: string;
  onlinePaymentOption: boolean;

  accountancyBody: string;

  showSocials: boolean;
  linkedinLink: string;
  xLink: string;
  bluesky: string;
};

const initialState: FormState = {
  name: '',
  domainName: '',
  companyType: '',
  grossWrittenPremium: '',
  gwpFinanced: '',
  hasOtherFinanceFirm: false,
  otherFinanceFirm: '',
  otherFinanceFirmExclusive: false,
  otherFinanceFirmExclusiveUntil: '',
  usesActuris: false,
  feeIncome: '',
  partnerDirectorsCount: '',
  internationalNetwork: '',
  practiceManagementSoftware: '',
  generalLedgerSoftware: '',
  onlinePaymentOption: false,
  accountancyBody: '',
  showSocials: false,
  linkedinLink: '',
  xLink: '',
  bluesky: '',
};

export const OnboardCompany = () => {
  const navigate = useNavigate();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const { createOneRecord, loading } = useCreateOneRecord({
    objectNameSingular: 'company',
  });

  const [form, setForm] = useState<FormState>(initialState);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isInsurance = form.companyType === 'INSURANCE_PREMIUM';
  const isAccountancy = form.companyType === 'ACCOUNTANCY_FEE';
  const isLegal = form.companyType === 'LEGAL_FEE';
  const isProfessional = isAccountancy || isLegal;

  const isValid =
    form.name.trim().length > 0 &&
    form.domainName.trim().length > 0 &&
    form.companyType !== '';

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!isValid) return;

      const input: Record<string, unknown> = {
        name: form.name.trim(),
        companyType: form.companyType,
      };

      const domain = toLinks(form.domainName);
      if (domain !== undefined) input.domainName = domain;

      if (form.showSocials) {
        const linkedin = toLinks(form.linkedinLink);
        const x = toLinks(form.xLink);
        const bsky = toLinks(form.bluesky);
        if (linkedin !== undefined) input.linkedinLink = linkedin;
        if (x !== undefined) input.xLink = x;
        if (bsky !== undefined) input.bluesky = bsky;
      }

      if (isInsurance) {
        const gwp = toCurrency(form.grossWrittenPremium);
        const gwpFin = toCurrency(form.gwpFinanced);
        if (gwp !== undefined) input.grossWrittenPremium = gwp;
        if (gwpFin !== undefined) input.gwpFinanced = gwpFin;
        input.hasOtherFinanceFirm = form.hasOtherFinanceFirm;
        if (form.hasOtherFinanceFirm) {
          if (form.otherFinanceFirm.trim()) {
            input.otherFinanceFirm = form.otherFinanceFirm.trim();
          }
          input.otherFinanceFirmExclusive = form.otherFinanceFirmExclusive;
          if (
            form.otherFinanceFirmExclusive &&
            form.otherFinanceFirmExclusiveUntil
          ) {
            input.otherFinanceFirmExclusiveUntil =
              form.otherFinanceFirmExclusiveUntil;
          }
        }
        input.usesActuris = form.usesActuris;
      }

      if (isProfessional) {
        const fee = toCurrency(form.feeIncome);
        if (fee !== undefined) input.feeIncome = fee;
        if (form.partnerDirectorsCount !== '') {
          const n = Number(form.partnerDirectorsCount);
          if (!Number.isNaN(n)) input.partnerDirectorsCount = n;
        }
        if (form.internationalNetwork.trim()) {
          input.internationalNetwork = form.internationalNetwork.trim();
        }
        if (form.practiceManagementSoftware.trim()) {
          input.practiceManagementSoftware =
            form.practiceManagementSoftware.trim();
        }
        if (form.generalLedgerSoftware.trim()) {
          input.generalLedgerSoftware = form.generalLedgerSoftware.trim();
        }
        input.onlinePaymentOption = form.onlinePaymentOption;
      }

      if (isAccountancy && form.accountancyBody.trim()) {
        input.accountancyBody = form.accountancyBody.trim();
      }

      try {
        const created = await createOneRecord(input);
        enqueueSuccessSnackBar({
          message: `Created ${form.name}`,
        });
        if (created?.id) {
          navigate(`/object/company/${created.id}`);
        } else {
          navigate('/objects/companies');
        }
      } catch (error) {
        enqueueErrorSnackBar({
          message:
            error instanceof Error ? error.message : 'Failed to create company',
        });
      }
    },
    [
      createOneRecord,
      enqueueErrorSnackBar,
      enqueueSuccessSnackBar,
      form,
      isAccountancy,
      isInsurance,
      isProfessional,
      isValid,
      navigate,
    ],
  );

  return (
    <PageContainer>
      <PageBody>
        <StyledPage>
          <StyledForm onSubmit={handleSubmit}>
            <StyledHeader>
              <StyledHeading>Onboard a new company</StyledHeading>
              <StyledSubheading>
                Pick a company type and fill in the details that apply.
              </StyledSubheading>
            </StyledHeader>

            <StyledFieldRow>
              <StyledLabel htmlFor="name">Company name</StyledLabel>
              <TextInput
                value={form.name}
                onChange={(value) => update('name', value)}
                placeholder="Acme Brokers Ltd"
                fullWidth
              />
            </StyledFieldRow>

            <StyledFieldRow>
              <StyledLabel htmlFor="domainName">Domain</StyledLabel>
              <TextInput
                value={form.domainName}
                onChange={(value) => update('domainName', value)}
                placeholder="acme.com"
                fullWidth
              />
            </StyledFieldRow>

            <StyledFieldRow>
              <StyledLabel htmlFor="companyType">Company type</StyledLabel>
              <StyledSelect
                id="companyType"
                value={form.companyType}
                onChange={(e) =>
                  update('companyType', e.target.value as CompanyType | '')
                }
              >
                <option value="">Select a type…</option>
                <option value="INSURANCE_PREMIUM">Insurance Premium</option>
                <option value="ACCOUNTANCY_FEE">Accountancy Fee</option>
                <option value="LEGAL_FEE">Legal Fee</option>
              </StyledSelect>
            </StyledFieldRow>

            {isInsurance && (
              <StyledSection>
                <StyledSectionTitle>Insurance Premium details</StyledSectionTitle>

                <StyledFieldRow>
                  <StyledLabel>Gross Written Premium</StyledLabel>
                  <CurrencyInput
                    value={form.grossWrittenPremium}
                    onChange={(value) => update('grossWrittenPremium', value)}
                  />
                </StyledFieldRow>

                <StyledFieldRow>
                  <StyledLabel>GWP Financed</StyledLabel>
                  <CurrencyInput
                    value={form.gwpFinanced}
                    onChange={(value) => update('gwpFinanced', value)}
                  />
                </StyledFieldRow>

                <StyledToggleRow>
                  <Toggle
                    value={form.hasOtherFinanceFirm}
                    onChange={(value) => update('hasOtherFinanceFirm', value)}
                  />
                  Already using another finance firm?
                </StyledToggleRow>

                {form.hasOtherFinanceFirm && (
                  <>
                    <StyledFieldRow>
                      <StyledLabel>Which finance firm?</StyledLabel>
                      <TextInput
                        value={form.otherFinanceFirm}
                        onChange={(value) => update('otherFinanceFirm', value)}
                        placeholder="Close Brothers"
                        fullWidth
                      />
                    </StyledFieldRow>

                    <StyledToggleRow>
                      <Toggle
                        value={form.otherFinanceFirmExclusive}
                        onChange={(value) =>
                          update('otherFinanceFirmExclusive', value)
                        }
                      />
                      Is the arrangement exclusive?
                    </StyledToggleRow>

                    {form.otherFinanceFirmExclusive && (
                      <StyledFieldRow>
                        <StyledLabel>Exclusive until</StyledLabel>
                        <StyledNativeInput
                          type="date"
                          value={form.otherFinanceFirmExclusiveUntil}
                          onChange={(e) =>
                            update(
                              'otherFinanceFirmExclusiveUntil',
                              e.target.value,
                            )
                          }
                        />
                      </StyledFieldRow>
                    )}
                  </>
                )}

                <StyledToggleRow>
                  <Toggle
                    value={form.usesActuris}
                    onChange={(value) => update('usesActuris', value)}
                  />
                  Uses Acturis?
                </StyledToggleRow>
              </StyledSection>
            )}

            {isProfessional && (
              <StyledSection>
                <StyledSectionTitle>
                  {isAccountancy ? 'Accountancy' : 'Legal'} details
                </StyledSectionTitle>

                <StyledFieldRow>
                  <StyledLabel>Fee Income</StyledLabel>
                  <CurrencyInput
                    value={form.feeIncome}
                    onChange={(value) => update('feeIncome', value)}
                  />
                </StyledFieldRow>

                <StyledFieldRow>
                  <StyledLabel>Number of Partners / Directors</StyledLabel>
                  <IntegerInput
                    value={form.partnerDirectorsCount}
                    onChange={(value) =>
                      update('partnerDirectorsCount', value)
                    }
                    placeholder="0"
                  />
                </StyledFieldRow>

                {isAccountancy && (
                  <StyledFieldRow>
                    <StyledLabel>Accountancy Body</StyledLabel>
                    <TextInput
                      value={form.accountancyBody}
                      onChange={(value) => update('accountancyBody', value)}
                      placeholder="ICAEW, ACCA, CIMA…"
                      fullWidth
                    />
                  </StyledFieldRow>
                )}

                <StyledFieldRow>
                  <StyledLabel>International Network (blank if none)</StyledLabel>
                  <TextInput
                    value={form.internationalNetwork}
                    onChange={(value) => update('internationalNetwork', value)}
                    placeholder="BDO, Kreston, Russell Bedford…"
                    fullWidth
                  />
                </StyledFieldRow>

                <StyledFieldRow>
                  <StyledLabel>Practice Management Software</StyledLabel>
                  <TextInput
                    value={form.practiceManagementSoftware}
                    onChange={(value) =>
                      update('practiceManagementSoftware', value)
                    }
                    placeholder="IRIS, CCH, Karbon…"
                    fullWidth
                  />
                </StyledFieldRow>

                <StyledFieldRow>
                  <StyledLabel>General Ledger Software</StyledLabel>
                  <TextInput
                    value={form.generalLedgerSoftware}
                    onChange={(value) =>
                      update('generalLedgerSoftware', value)
                    }
                    placeholder="Xero, QuickBooks, Sage…"
                    fullWidth
                  />
                </StyledFieldRow>

                <StyledToggleRow>
                  <Toggle
                    value={form.onlinePaymentOption}
                    onChange={(value) => update('onlinePaymentOption', value)}
                  />
                  Online Payment Option enabled?
                </StyledToggleRow>
              </StyledSection>
            )}

            <StyledSection>
              <StyledToggleRow>
                <Toggle
                  value={form.showSocials}
                  onChange={(value) => update('showSocials', value)}
                />
                Add social media info
              </StyledToggleRow>

              {form.showSocials && (
                <>
                  <StyledFieldRow>
                    <StyledLabel>LinkedIn</StyledLabel>
                    <TextInput
                      value={form.linkedinLink}
                      onChange={(value) => update('linkedinLink', value)}
                      placeholder="linkedin.com/company/acme"
                      fullWidth
                    />
                  </StyledFieldRow>

                  <StyledFieldRow>
                    <StyledLabel>X</StyledLabel>
                    <TextInput
                      value={form.xLink}
                      onChange={(value) => update('xLink', value)}
                      placeholder="x.com/acme"
                      fullWidth
                    />
                  </StyledFieldRow>

                  <StyledFieldRow>
                    <StyledLabel>Bluesky</StyledLabel>
                    <TextInput
                      value={form.bluesky}
                      onChange={(value) => update('bluesky', value)}
                      placeholder="bsky.app/profile/acme"
                      fullWidth
                    />
                  </StyledFieldRow>
                </>
              )}
            </StyledSection>

            <StyledActions>
              <Button
                title="Cancel"
                variant="secondary"
                onClick={() => navigate('/objects/companies')}
              />
              <Button
                title={loading ? 'Creating…' : 'Create company'}
                variant="primary"
                accent="blue"
                type="submit"
                disabled={!isValid || loading}
              />
            </StyledActions>
          </StyledForm>
        </StyledPage>
      </PageBody>
    </PageContainer>
  );
};
