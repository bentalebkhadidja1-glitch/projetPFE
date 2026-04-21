import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WILAYA_NAMES, communesForWilaya } from '@/data/wilayasCommunes';
import { CheckCircle, Mail, ArrowLeft, XCircle } from 'lucide-react';

const POSITION_OPTIONS_FR = [
  { value: '', label: '—' },
  { value: 'extrait_sans_filiation', label: 'Extrait sans filiation' },
  { value: 'extrait_avec_filiation', label: 'Extrait avec filiation' },
  { value: 'copie_integrale', label: 'Copie intégrale' },
  { value: 'copie_litterale', label: 'Copie littérale' },
  { value: 'mention_marginal', label: 'Mention marginale' },
];

export interface BirthActCitizenShape {
  firstName?: string;
  lastName?: string;
  email?: string;
  nin?: string;
  wilaya?: string;
  commune?: string;
  actYear?: string;
  actNumber?: string;
}

interface BirthActTraitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citizen: BirthActCitizenShape | null;
  language: 'fr' | 'en';
  onValidate: () => void;
  onCancel: () => void;
}

function ensureWilayaOption(wilaya: string, list: string[]): string[] {
  const w = wilaya.trim();
  if (!w) return list;
  if (list.some((x) => x.toLowerCase() === w.toLowerCase())) return list;
  return [w, ...list].sort((a, b) => a.localeCompare(b, 'fr'));
}

function ensureCommuneOption(commune: string, list: string[]): string[] {
  const c = commune.trim();
  if (!c) return list;
  if (list.some((x) => x.toLowerCase() === c.toLowerCase())) return list;
  return [c, ...list].sort((a, b) => a.localeCompare(b, 'fr'));
}

// ─── Step 2: Demande d'Acte de Naissance ─────────────────────────────────────
function DemandePreview({
  citizen, wilaya, commune, actYear, actNumber, position, copiesCount,
  language, onApprove, onReject, onBack,
}: {
  citizen: BirthActCitizenShape;
  wilaya: string; commune: string; actYear: string; actNumber: string;
  position: string; copiesCount: string; language: 'fr' | 'en';
  onApprove: () => void; onReject: () => void; onBack: () => void;
}) {
  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-sm font-semibold text-slate-600">{label}:</label>
      <div className="border border-blue-300 rounded px-3 py-2 bg-blue-50 text-slate-800 text-sm">
        {value || '—'}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-slate-700 text-white rounded-lg p-4 text-center">
        <h3 className="font-bold text-base">Demande d'Acte de Naissance</h3>
        <p className="text-slate-300 text-xs mt-1">Birth Certificate Request</p>
      </div>

      {/* Fields */}
      <div className="px-1">
        <Field label="Wilaya" value={wilaya} />
        <Field label="Commune" value={commune} />
        <Field label="Année de l'acte (Year)" value={actYear} />
        <Field label="N° de l'acte (Act Number)" value={actNumber} />
        <Field label="Position" value={position} />
        <Field label="Nombre de Copies" value={copiesCount} />
      </div>

      {/* Requester Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-center font-semibold text-slate-700 mb-3 text-sm">Requester Information</p>
        <div className="space-y-2 text-sm">
          {[
            { label: 'First Name', value: citizen.firstName },
            { label: 'Last Name', value: citizen.lastName },
            { label: 'Email', value: citizen.email },
            { label: 'NIN', value: citizen.nin },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-slate-500">{label}:</span>
              <span className={`font-medium ${label === 'Email' ? 'text-blue-600' : 'text-slate-800'} font-${label === 'NIN' ? 'mono' : 'normal'}`}>
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          {language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button type="button" onClick={onReject}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1">
          <XCircle className="w-4 h-4" /> ✕ REJECT
        </Button>
        <Button type="button" onClick={onApprove}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1">
          <CheckCircle className="w-4 h-4" /> ✓ APPROVE
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Arabic Birth Certificate ────────────────────────────────────────
function BirthCertificatePreview({
  citizen, wilaya, commune, actYear, actNumber, language, onSendEmail, onBack,
}: {
  citizen: BirthActCitizenShape;
  wilaya: string; commune: string; actYear: string; actNumber: string;
  language: 'fr' | 'en'; onSendEmail: () => void; onBack: () => void;
}) {
  const today = new Date().toLocaleDateString('fr-FR');

  return (
    <div className="flex flex-col gap-4">
      <div dir="rtl" className="border border-slate-300 rounded-lg p-5 bg-white text-right"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '2' }}>
        <div className="text-center mb-2">
          <p className="font-bold text-sm">الجمهورية الجزائرية الديموقراطية الشعبية</p>
          <p className="text-xs">وزارة الداخلية والجماعات المحلية</p>
        </div>
        <div className="text-xs mb-3 space-y-0.5">
          <p>ولاية <span className="font-bold underline">{wilaya || 'مستقانم'}</span></p>
          <p>دائرة <span className="font-bold underline">{commune || 'مستقانم'}</span></p>
          <p>بلدية <span className="font-bold underline">{commune || 'مستقانم'}</span></p>
        </div>
        <div className="text-center my-3">
          <h2 className="text-lg font-bold">شهادة الميلاد</h2>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <span>رقم الشهادة: <span className="font-bold">{actNumber || '............'}</span></span>
          <span>{actYear || '..../.../...'}</span>
        </div>
        <div className="text-xs space-y-2">
          <p>في يوم <span className="border-b border-dotted border-slate-400 inline-block w-28">............</span>
            &nbsp;على الساعة <span className="border-b border-dotted border-slate-400 inline-block w-16">......</span></p>
          <p>ولد(ت)ب <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;ولاية <span className="font-bold">{wilaya || '............'}</span></p>
          <p>المسمى(ة) <span className="font-bold">{citizen.firstName} {citizen.lastName}</span></p>
          <p>الجنس <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span></p>
          <p>ابن(ة) <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span>
            &nbsp;عمره <span className="border-b border-dotted border-slate-400 inline-block w-12">......</span>
            &nbsp;مهنته <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span></p>
          <p>و <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span>
            &nbsp;عمرها <span className="border-b border-dotted border-slate-400 inline-block w-12">.././././.</span>
            &nbsp;مهنتها <span className="border-b border-dotted border-slate-400 inline-block w-20">././././..</span></p>
          <p>الساكنين <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;بلدية <span className="font-bold">{commune || '............'}</span>
            &nbsp;ولاية <span className="font-bold">{wilaya || '............'}</span></p>
          <p>حرر في <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;على الساعة <span className="border-b border-dotted border-slate-400 inline-block w-16">......</span></p>
          <p>البيانات الهامشية <span className="border-b border-dotted border-slate-400 inline-block w-40">................</span></p>
          {[...Array(3)].map((_, i) => <p key={i} className="border-b border-dotted border-slate-300 w-full">&nbsp;</p>)}
        </div>
        <div className="mt-3 text-xs">
          <p>حررت ب <span className="font-bold">{commune || 'مستقانم'}</span> في {today}</p>
        </div>
        <div className="mt-3 text-xs text-center border-t pt-2">
          <p className="text-red-600 font-bold">الكتابة السابقة للاسم واللقب بالأحرف اللاتينية</p>
          <p className="border-b border-dotted border-slate-400 inline-block w-56 mt-1">&nbsp;</p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm border border-slate-200 dark:border-slate-600">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {language === 'fr' ? 'Citoyen' : 'Citizen'}:
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          {citizen.firstName} {citizen.lastName} — <span className="text-blue-600">{citizen.email}</span>
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button type="button" onClick={onSendEmail}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" />
          {language === 'fr' ? 'Envoyer par Email' : 'Send by Email'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function BirthActTraitmentDialog({
  open, onOpenChange, citizen, language, onValidate, onCancel,
}: BirthActTraitmentDialogProps) {
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [actYear, setActYear] = useState('');
  const [actNumber, setActNumber] = useState('');
  const [position, setPosition] = useState('');
  const [copiesCount, setCopiesCount] = useState('1');
  const [step, setStep] = useState<'form' | 'demande' | 'certificate'>('form');

  const tr = useMemo(() => language === 'fr' ? {
    title: 'Traitement — Acte de naissance',
    subtitle: 'Vérifiez les informations issues du dossier avant de poursuivre.',
    certTitle: 'Acte de Naissance — شهادة الميلاد',
    certSubtitle: 'Vérifiez le document avant envoi.',
    wilaya: 'Wilaya', commune: 'Commune', actYear: "Année de l'acte",
    actNumber: "N° de l'acte", position: 'Position', copies: 'Nbre de Copies',
    firstName: 'Prénom', lastName: 'Nom', validate: 'Valider', cancel: 'Annuler', select: 'Sélectionner',
  } : {
    title: 'Processing — Birth certificate',
    subtitle: 'Review the information from the file before continuing.',
    certTitle: 'Birth Certificate — شهادة الميلاد',
    certSubtitle: 'Review the document before sending.',
    wilaya: 'Wilaya', commune: 'Municipality', actYear: 'Year of act',
    actNumber: 'Act number', position: 'Position', copies: 'Number of copies',
    firstName: 'First name', lastName: 'Last name', validate: 'Confirm', cancel: 'Cancel', select: 'Select',
  }, [language]);

  useEffect(() => {
    if (!open || !citizen) return;
    setWilaya(citizen.wilaya?.trim() || '');
    setCommune(citizen.commune?.trim() || '');
    setActYear(citizen.actYear?.trim() || '');
    setActNumber(citizen.actNumber?.trim() || '');
    setPosition('');
    setCopiesCount('1');
    setStep('form');
  }, [open, citizen]);

  const wilayaOptions = useMemo(() => ensureWilayaOption(wilaya, [...WILAYA_NAMES]), [wilaya]);
  const communeOptions = useMemo(() => {
    const base = wilaya ? communesForWilaya(wilaya) : [];
    return ensureCommuneOption(commune, base);
  }, [wilaya, commune]);

  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="grid grid-cols-[minmax(140px,32%)_1fr] gap-3 items-center border-b border-slate-200 dark:border-slate-600 py-3 last:border-b-0">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );

  const handleSendEmail = () => {
    const email = citizen?.email || '';
    const subject = encodeURIComponent('شهادة الميلاد - Acte de Naissance');
    const body = encodeURIComponent(
      `Bonjour ${citizen?.firstName || ''} ${citizen?.lastName || ''},\n\nVeuillez trouver ci-joint votre acte de naissance.\n\nCordialement,\nService d'état civil`
    );
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">

        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{tr.title}</DialogTitle>
              <DialogDescription>{tr.subtitle}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 bg-slate-50/50 dark:bg-slate-800/40">
              <Row label={tr.firstName}>
                <Input readOnly value={citizen?.firstName ?? ''} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
              </Row>
              <Row label={tr.lastName}>
                <Input readOnly value={citizen?.lastName ?? ''} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
              </Row>
              <Row label={tr.wilaya}>
                <Select value={wilaya || undefined} onValueChange={(v) => { setWilaya(v); setCommune(''); }}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-full">
                    <SelectValue placeholder={tr.select} />
                  </SelectTrigger>
                  <SelectContent>
                    {wilayaOptions.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label={tr.commune}>
                <Select value={commune || undefined} onValueChange={setCommune} disabled={communeOptions.length === 0}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-full">
                    <SelectValue placeholder={tr.select} />
                  </SelectTrigger>
                  <SelectContent>
                    {communeOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label={tr.actYear}>
                <Input value={actYear} onChange={(e) => setActYear(e.target.value)} placeholder="—"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
              </Row>
              <Row label={tr.actNumber}>
                <Input value={actNumber} onChange={(e) => setActNumber(e.target.value)} placeholder="—"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 font-mono" />
              </Row>
              <Row label={tr.position}>
                <Select value={position || undefined} onValueChange={setPosition}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-full">
                    <SelectValue placeholder={tr.select} />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS_FR.filter((o) => o.value !== '').map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label={tr.copies}>
                <Input type="number" min={1} max={99} value={copiesCount}
                  onChange={(e) => setCopiesCount(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-24" />
              </Row>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { onCancel(); onOpenChange(false); }}>
                {tr.cancel}
              </Button>
              <Button type="button" onClick={() => { setStep('demande'); onValidate(); }} className="bg-blue-600 hover:bg-blue-700">
                {tr.validate}
              </Button>
            </div>
          </>
        )}

        {step === 'demande' && citizen && (
          <DemandePreview
            citizen={citizen} wilaya={wilaya} commune={commune}
            actYear={actYear} actNumber={actNumber}
            position={POSITION_OPTIONS_FR.find(o => o.value === position)?.label || position}
            copiesCount={copiesCount} language={language}
            onApprove={() => setStep('certificate')}
            onReject={() => onOpenChange(false)}
            onBack={() => setStep('form')}
          />
        )}

        {step === 'certificate' && citizen && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {tr.certTitle}
              </DialogTitle>
              <DialogDescription>{tr.certSubtitle}</DialogDescription>
            </DialogHeader>
            <BirthCertificatePreview
              citizen={citizen} wilaya={wilaya} commune={commune}
              actYear={actYear} actNumber={actNumber} language={language}
              onSendEmail={handleSendEmail}
              onBack={() => setStep('demande')}
            />
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}