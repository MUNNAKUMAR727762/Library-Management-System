import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, CreditCard, FileText, ImagePlus, Loader2, Phone, UploadCloud, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { admissionApi, extractApiError } from '@/lib/api';
import { optimizeAdmissionPhoto } from '@/lib/image-upload';
import { ShiftMultiSelect } from '@/components/ShiftMultiSelect';
import { DecoratedFieldShell, DecoratedLabel } from '@/components/FormFieldDecorators';

const MAX_SOURCE_UPLOAD_BYTES = 12 * 1024 * 1024;

interface SubmittedRequestSummary {
  name: string;
  mobile: string;
  seatNumber: number | null;
  shiftLabels: string[];
}

export default function AdmissionPage() {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherNumber, setFatherNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedShiftIds, setSelectedShiftIds] = useState<number[]>([]);
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequestSummary | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token') || '';

  const formQuery = useQuery({
    queryKey: ['public-admission-form', token],
    queryFn: () => admissionApi.getForm(token),
    enabled: Boolean(token),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('mobile', mobile);
      formData.append('father_name', fatherName);
      formData.append('father_number', fatherNumber);
      formData.append('aadhar_number', aadharNumber);
      formData.append('notes', notes);
      formData.append('token', token);
      selectedShiftIds.forEach((shiftId) => formData.append('shift_ids', String(shiftId)));
      if (photo) formData.append('photo', photo);
      return admissionApi.createRequest(formData);
    },
    onSuccess: () => {
      const shiftLabels = selectedShiftIds.map((shiftId) => {
        const option = formQuery.data?.shiftOptions.find((item) => item.id === shiftId);
        return option?.label ?? `Shift ${shiftId}`;
      });
      setSubmittedRequest({
        name: name.trim(),
        mobile: mobile.trim(),
        seatNumber: formQuery.data?.seatNumber ?? null,
        shiftLabels,
      });
      setError('');
      setName('');
      setMobile('');
      setFatherName('');
      setFatherNumber('');
      setAadharNumber('');
      setNotes('');
      setSelectedShiftIds(formQuery.data?.shiftIds ?? []);
      setPhoto(null);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview('');
    },
    onError: (submissionError) => {
      setError(extractApiError(submissionError));
      setSubmittedRequest(null);
    },
  });

  const handlePhotoChange = async (file: File | null) => {
    setError('');
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview('');
    }
    if (!file) {
      setPhoto(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Photo must be a JPG or PNG image.');
      return;
    }

    if (file.size > MAX_SOURCE_UPLOAD_BYTES) {
      setError('Photo must be 12 MB or smaller before preparation.');
      return;
    }
    setIsPreparingPhoto(true);
    try {
      const optimizedPhoto = await optimizeAdmissionPhoto(file);
      setPhoto(optimizedPhoto);
      setPhotoPreview(URL.createObjectURL(optimizedPhoto));
    } catch (photoError) {
      setPhoto(null);
      setError(extractApiError(photoError));
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  useEffect(() => {
    if (formQuery.data?.shiftIds?.length && selectedShiftIds.length === 0) {
      setSelectedShiftIds(formQuery.data.shiftIds);
    }
  }, [formQuery.data, selectedShiftIds.length]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const canSubmit = useMemo(
    () => Boolean(formQuery.data?.available && name.trim() && mobile.trim() && photo && selectedShiftIds.length && !isPreparingPhoto),
    [formQuery.data?.available, isPreparingPhoto, mobile, name, photo, selectedShiftIds.length],
  );

  const isExpiredLink = error.toLowerCase().includes('invalid or expired');
  const availableShiftIds = new Set((formQuery.data?.shiftOptions ?? []).filter((option) => option.available).map((option) => option.id));
  const fieldInputClassName = 'h-11 rounded-xl border-border/70 bg-background pl-12 text-sm shadow-sm focus-visible:ring-primary/30';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(204_42%_97%),hsl(198_45%_94%))] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="overflow-hidden rounded-[28px] border border-primary/10 bg-[linear-gradient(160deg,hsl(214_80%_46%),hsl(202_82%_34%))] p-6 text-primary-foreground sm:p-8">
          <div className="space-y-6">
            <div className="inline-flex rounded-2xl bg-white/12 p-3 backdrop-blur">
              <Logo size="lg" showTagline />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">Admission Form</p>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Gyan Sthal Student Request</h1>
              <p className="max-w-md text-sm leading-6 text-white/82 sm:text-base">
                Fill the student details, choose the shift, and upload one clear photo. The photo is prepared automatically for fast mobile upload.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Seat</p>
                <p className="mt-2 text-3xl font-semibold">#{formQuery.data?.seatNumber ?? '-'}</p>
                <p className="mt-1 text-sm text-white/75">{formQuery.data?.shiftLabel ?? 'Shift loading'}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Status</p>
                <p className="mt-2 text-2xl font-semibold">{formQuery.data?.available ? 'Available' : 'Unavailable'}</p>
                <p className="mt-1 text-sm text-white/75">{formQuery.data?.shiftTime ?? 'Please wait'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
              <p className="text-sm font-semibold text-white">Fast mobile form</p>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Enter the student details and upload one face photo. The system prepares the image before sending it.
              </p>
            </div>
          </div>
        </section>

        <section className="card-surface rounded-[28px] border border-border/70 p-5 sm:p-8" style={{ boxShadow: 'var(--shadow-modal)' }}>
          {submittedRequest ? (
            <div className="flex min-h-[540px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-status-available/12 text-status-available">
                <CheckCircle2 size={34} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-foreground">Request Submitted</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                The admin team will review this request shortly.
              </p>
              <div className="mt-6 w-full max-w-md space-y-3 rounded-2xl bg-secondary p-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="label-caps">Student</span>
                  <span className="text-sm font-semibold text-foreground">{submittedRequest.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="label-caps">Mobile</span>
                  <span className="text-sm font-semibold text-foreground">{submittedRequest.mobile}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="label-caps">Seat</span>
                  <span className="text-sm font-semibold text-foreground">#{submittedRequest.seatNumber ?? '-'}</span>
                </div>
                <div className="space-y-2">
                  <span className="label-caps">Shift</span>
                  <div className="flex flex-wrap gap-2">
                    {submittedRequest.shiftLabels.map((shiftLabel) => (
                      <span key={shiftLabel} className="rounded-full bg-background px-3 py-1 text-sm font-medium text-foreground">
                        {shiftLabel}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="label-caps">Student Form</p>
                <h2 className="text-2xl font-bold text-foreground">Complete your request</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Use the form below to submit the student details.
                </p>
              </div>

              {formQuery.isLoading ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  Loading admission details...
                </div>
              ) : null}

              {!formQuery.isLoading && !formQuery.data?.available && !isExpiredLink ? (
                <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  This seat is not available anymore. Please contact admin for a fresh QR link.
                </div>
              ) : null}

              {isExpiredLink ? (
                <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4">
                  <p className="text-sm font-semibold text-destructive">This admission link has expired.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please contact admin at Gyan Sthal Library on <span className="font-semibold text-foreground">9060624490</span>.
                  </p>
                </div>
              ) : null}

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const normalizedStudentMobile = mobile.trim();
                  const normalizedFatherMobile = fatherNumber.trim();
                  const normalizedAadhar = aadharNumber.trim();
                  if (!/^[6-9]\d{9}$/.test(normalizedStudentMobile)) {
                    setError('Student mobile number must be a valid 10-digit Indian mobile number.');
                    return;
                  }
                  if (normalizedFatherMobile && !/^[6-9]\d{9}$/.test(normalizedFatherMobile)) {
                    setError('Father mobile number must be a valid 10-digit Indian mobile number.');
                    return;
                  }
                  if (normalizedAadhar && !/^\d{12}$/.test(normalizedAadhar)) {
                    setError('Aadhar number must be exactly 12 digits.');
                    return;
                  }
                  if (!selectedShiftIds.length || selectedShiftIds.length > 3) {
                    setError('Please select between 1 and 3 shifts.');
                    return;
                  }
                  if (canSubmit) mutation.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <DecoratedLabel htmlFor="admission-name" icon={User} required>Student Name</DecoratedLabel>
                    <DecoratedFieldShell icon={User}>
                      <Input
                        id="admission-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        placeholder="Enter full name"
                        className={fieldInputClassName}
                      />
                    </DecoratedFieldShell>
                  </div>
                  <div className="space-y-2">
                    <DecoratedLabel htmlFor="admission-mobile" icon={Phone} required>Student Mobile</DecoratedLabel>
                    <DecoratedFieldShell icon={Phone}>
                      <Input
                        id="admission-mobile"
                        inputMode="numeric"
                        value={mobile}
                        onChange={(event) => setMobile(event.target.value)}
                        required
                        placeholder="10-digit mobile number"
                        className={fieldInputClassName}
                      />
                    </DecoratedFieldShell>
                  </div>
                  <div className="space-y-2">
                    <DecoratedLabel htmlFor="admission-father-name" icon={Users}>Father Name</DecoratedLabel>
                    <DecoratedFieldShell icon={Users}>
                      <Input
                        id="admission-father-name"
                        value={fatherName}
                        onChange={(event) => setFatherName(event.target.value)}
                        placeholder="Father or guardian name"
                        className={fieldInputClassName}
                      />
                    </DecoratedFieldShell>
                  </div>
                  <div className="space-y-2">
                    <DecoratedLabel htmlFor="admission-father-number" icon={Phone}>Father Mobile Number</DecoratedLabel>
                    <DecoratedFieldShell icon={Phone}>
                      <Input
                        id="admission-father-number"
                        inputMode="numeric"
                        value={fatherNumber}
                        onChange={(event) => setFatherNumber(event.target.value)}
                        placeholder="Guardian mobile number"
                        className={fieldInputClassName}
                      />
                    </DecoratedFieldShell>
                  </div>
                  <div className="space-y-2">
                    <DecoratedLabel htmlFor="admission-aadhar" icon={CreditCard}>Aadhar Number</DecoratedLabel>
                    <DecoratedFieldShell icon={CreditCard}>
                      <Input
                        id="admission-aadhar"
                        inputMode="numeric"
                        value={aadharNumber}
                        onChange={(event) => setAadharNumber(event.target.value)}
                        placeholder="12-digit Aadhar number"
                        className={fieldInputClassName}
                      />
                    </DecoratedFieldShell>
                  </div>
                </div>

                <div className="space-y-2">
                  <ShiftMultiSelect
                    shifts={(formQuery.data?.shiftOptions ?? []).map((option) => ({
                      id: option.id,
                      label: option.available ? option.label : `${option.label} (Unavailable)`,
                      time: option.time,
                    }))}
                    selectedShiftIds={selectedShiftIds}
                    disabledShiftIds={(formQuery.data?.shiftOptions ?? []).filter((option) => !option.available).map((option) => option.id)}
                    onChange={(shiftIds) => setSelectedShiftIds(shiftIds.filter((shiftId) => availableShiftIds.has(shiftId)))}
                    label="Preferred Shift *"
                    helperText="Choose one or more available shifts for this seat."
                    labelIcon={Clock3}
                  />
                </div>

                <div className="space-y-2">
                  <DecoratedLabel htmlFor="admission-photo" icon={ImagePlus} required>Student Photo</DecoratedLabel>
                  <label
                    htmlFor="admission-photo"
                    className="block cursor-pointer rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-4 transition-colors hover:border-primary/45 hover:bg-primary/10"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Student preview" className="h-full w-full rounded-2xl object-cover" />
                        ) : (
                          <ImagePlus size={24} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {photo ? 'Change uploaded photo' : 'Tap to upload student photo'}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          JPG or PNG, up to 12 MB before preparation.
                        </p>
                        {photo ? (
                          <p className="text-xs font-medium text-primary">
                            {photo.name} - {Math.round(photo.size / 1024)} KB
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </label>
                  <input
                    id="admission-photo"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => {
                      void handlePhotoChange(event.target.files?.[0] ?? null);
                    }}
                    className="sr-only"
                    required
                  />
                  {isPreparingPhoto ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      Preparing photo for upload...
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <DecoratedLabel htmlFor="admission-notes" icon={FileText}>Notes</DecoratedLabel>
                  <DecoratedFieldShell icon={FileText}>
                    <Input
                      id="admission-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Optional note for admin"
                      className={fieldInputClassName}
                    />
                  </DecoratedFieldShell>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <UploadCloud size={18} />
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Submit one clear student photo. Admin will review the request after submission.
                    </p>
                  </div>
                </div>

                {error && !isExpiredLink ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={!canSubmit || mutation.isPending || isPreparingPhoto}>
                  {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  {mutation.isPending ? 'Submitting...' : isPreparingPhoto ? 'Preparing Photo...' : 'Submit Admission Request'}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
