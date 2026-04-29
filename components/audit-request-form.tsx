"use client";

import { useUser } from "@clerk/nextjs";
import type React from "react";

import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Upload, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

type ServiceCategory = "website" | "mobile" | "physical";
type ServicePackage = "automated" | "hybrid" | "expert";

interface FormData {
  customerId: string;
  projectName: string;
  serviceCategory: ServiceCategory | "";
  targetUrl: string;
  locationAddress: string;
  accessibilityStandard: string;
  servicePackage: ServicePackage | "";
  devices: string[];
  specialInstructions: string;
  files: File[];
  // scan configuration
  scanScope: "single" | "full_site";
  maxPages: number;
  loginRequired: boolean;
  loginUrl: string;
  username: string;
  password: string;
  usernameField: string;
  passwordField: string;
  submitSelector: string;
}

export function AuditRequestForm() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { t } = useTranslation();

  const STEPS = [
    {
      number: 1,
      title: t.auditForm.steps.step1Title,
      description: t.auditForm.steps.step1Description,
    },
    {
      number: 2,
      title: t.auditForm.steps.step2Title,
      description: t.auditForm.steps.step2Description,
    },
    {
      number: 3,
      title: t.auditForm.steps.step3Title,
      description: t.auditForm.steps.step3Description,
    },
    {
      number: 4,
      title: t.auditForm.steps.step4Title,
      description: t.auditForm.steps.step4Description,
    },
  ];

  const SERVICE_PACKAGES = [
    {
      value: "automated" as const,
      title: t.auditForm.packages.automatedTitle,
      description: t.auditForm.packages.automatedDesc,
    },
    {
      value: "hybrid" as const,
      title: t.auditForm.packages.hybridTitle,
      description: t.auditForm.packages.hybridDesc,
    },
    {
      value: "expert" as const,
      title: t.auditForm.packages.expertTitle,
      description: t.auditForm.packages.expertDesc,
    },
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    customerId: "",
    projectName: "",
    serviceCategory: "",
    targetUrl: "",
    locationAddress: "",
    accessibilityStandard: "",
    servicePackage: "",
    devices: [],
    specialInstructions: "",
    files: [],
    scanScope: "single",
    maxPages: 50,
    loginRequired: false,
    loginUrl: "",
    username: "",
    password: "",
    usernameField: 'input[name="email"]',
    passwordField: 'input[name="password"]',
    submitSelector: 'button[type="submit"]',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      // ยังไม่ล็อกอิน → จะเลือก redirect หรือแค่ปล่อยไว้ก็ได้
      // router.push("/sign-in") // ถ้าอยากให้เด้งไปหน้า login
      return;
    }

    // set customerId จาก user.id
    setFormData((prev) => ({
      ...prev,
      customerId: user.id,
    }));
  }, [isLoaded, isSignedIn, user]);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 1) {
      if (!formData.projectName.trim()) {
        newErrors.projectName = "Project name is required";
      }
      if (!formData.serviceCategory) {
        newErrors.serviceCategory = "Service category is required";
      }
      if (
        formData.serviceCategory !== "physical" &&
        !formData.targetUrl.trim()
      ) {
        newErrors.targetUrl = "Target URL or App Store Link is required";
      }
      if (
        formData.serviceCategory === "physical" &&
        !formData.locationAddress.trim()
      ) {
        newErrors.locationAddress = "Location address is required";
      }
    }

    if (step === 2) {
      if (!formData.accessibilityStandard) {
        newErrors.accessibilityStandard = "Accessibility standard is required";
      }
      if (!formData.servicePackage) {
        newErrors.servicePackage = "Service package is required";
      }
    }

    if (step === 3) {
      if (formData.devices.length === 0) {
        newErrors.devices = "Please select at least one device to test";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // 1) validate step ก่อน
    if (!validateStep(currentStep)) return;

    // 2) เช็กสถานะ user จาก Clerk
    if (!isLoaded) {
      // ยังโหลดข้อมูล user ไม่เสร็จ
      return;
    }

    if (!isSignedIn || !user) {
      alert("กรุณาเข้าสู่ระบบก่อนส่งคำขอ");
      return;
    }

    try {
      const { files, password, ...rest } = formData;
      const customerId = user.id;

      // 3) เรียก API บันทึกข้อมูลไป backend
      const res = await fetch(
        `/api/audit-requests?customerId=${encodeURIComponent(customerId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...rest,
            customerId,
            password, // API จะ encrypt ก่อน save และไม่ return กลับ
            files: files.map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          }),
        },
      );

      if (!res.ok) {
        console.error("Submit failed", await res.text());
        alert("ส่งคำขอไม่สำเร็จ ลองอีกครั้งครับ");
        return;
      }

      // 4) ถ้าสำเร็จ
      setIsSubmitted(true);
      alert("ส่งคำขอสำเร็จแล้ว!");

      // ⬇⬇⬇ กลับไปหน้า dashboard customer
      router.push("/dashboard/customer");
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("เกิดปัญหาในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      updateFormData("files", Array.from(e.target.files));
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  if (isSubmitted) {
    return (
      <Card className="border-2 border-accent">
        <CardContent className="pt-12 pb-12 text-center">
          <CheckCircle2
            className="w-16 h-16 mx-auto mb-4 text-accent"
            aria-hidden="true"
          />
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            {t.auditForm.success.title}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t.auditForm.success.description}
          </p>
          <Button
            onClick={() => {
              setIsSubmitted(false);
              setCurrentStep(1);
              setFormData({
                customerId: "",
                projectName: "",
                serviceCategory: "",
                targetUrl: "",
                locationAddress: "",
                accessibilityStandard: "",
                servicePackage: "",
                devices: [],
                specialInstructions: "",
                files: [],
                scanScope: "single",
                maxPages: 50,
                loginRequired: false,
                loginUrl: "",
                username: "",
                password: "",
                usernameField: 'input[name="email"]',
                passwordField: 'input[name="password"]',
                submitSelector: 'button[type="submit"]',
              });
            }}
            size="lg"
          >
            {t.auditForm.buttons.submitAnother}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div
        className="space-y-2"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.auditForm.progress.ariaLabel}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {t.auditForm.progress.stepOf
              .replace("{current}", String(currentStep))
              .replace("{total}", String(STEPS.length))}
          </span>
          <span className="text-muted-foreground">
            {t.auditForm.progress.percentComplete.replace(
              "{percent}",
              String(Math.round(progress)),
            )}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {STEPS.map((step) => (
          <div
            key={step.number}
            className={cn(
              "flex-1 text-center pb-4 border-b-2 transition-colors",
              currentStep >= step.number
                ? "border-accent text-accent"
                : "border-border text-muted-foreground",
            )}
          >
            <div className="text-sm font-medium">{step.number}</div>
            <div className="text-xs hidden sm:block mt-1">{step.title}</div>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription className="text-base">
            {STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Project Basic Info */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="projectName" className="text-base font-medium">
                  {t.auditForm.labels.projectName}{" "}
                  <span className="text-destructive" aria-label="required">
                    *
                  </span>
                </Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) =>
                    updateFormData("projectName", e.target.value)
                  }
                  placeholder={t.auditForm.placeholders.projectName}
                  className={cn(
                    "h-12 text-base",
                    errors.projectName && "border-destructive border-2",
                  )}
                  aria-invalid={!!errors.projectName}
                  aria-describedby={
                    errors.projectName ? "projectName-error" : undefined
                  }
                />
                {errors.projectName && (
                  <p
                    id="projectName-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {errors.projectName}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">
                  {t.auditForm.labels.serviceCategory}{" "}
                  <span className="text-destructive" aria-label="required">
                    *
                  </span>
                </Label>
                <RadioGroup
                  value={formData.serviceCategory}
                  onValueChange={(value) =>
                    updateFormData("serviceCategory", value as ServiceCategory)
                  }
                  className="space-y-3"
                  aria-invalid={!!errors.serviceCategory}
                  aria-describedby={
                    errors.serviceCategory ? "serviceCategory-error" : undefined
                  }
                >
                  <div className="flex items-center space-x-3 rounded-md border border-border p-4 hover:bg-accent/5 transition-colors">
                    <RadioGroupItem
                      value="website"
                      id="website"
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor="website"
                      className="flex-1 cursor-pointer text-base font-normal"
                    >
                      {t.auditForm.options.website}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-md border border-border p-4 hover:bg-accent/5 transition-colors">
                    <RadioGroupItem
                      value="mobile"
                      id="mobile"
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor="mobile"
                      className="flex-1 cursor-pointer text-base font-normal"
                    >
                      {t.auditForm.options.mobileApp}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-md border border-border p-4 hover:bg-accent/5 transition-colors">
                    <RadioGroupItem
                      value="physical"
                      id="physical"
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor="physical"
                      className="flex-1 cursor-pointer text-base font-normal"
                    >
                      {t.auditForm.options.physicalSpace}
                    </Label>
                  </div>
                </RadioGroup>
                {errors.serviceCategory && (
                  <p
                    id="serviceCategory-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {errors.serviceCategory}
                  </p>
                )}
              </div>

              {formData.serviceCategory &&
                formData.serviceCategory !== "physical" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="targetUrl"
                      className="text-base font-medium"
                    >
                      {t.auditForm.labels.targetUrl}{" "}
                      <span className="text-destructive" aria-label="required">
                        *
                      </span>
                    </Label>
                    <Input
                      id="targetUrl"
                      type="url"
                      value={formData.targetUrl}
                      onChange={(e) =>
                        updateFormData("targetUrl", e.target.value)
                      }
                      placeholder={t.auditForm.placeholders.targetUrl}
                      className={cn(
                        "h-12 text-base",
                        errors.targetUrl && "border-destructive border-2",
                      )}
                      aria-invalid={!!errors.targetUrl}
                      aria-describedby={
                        errors.targetUrl ? "targetUrl-error" : undefined
                      }
                    />
                    {errors.targetUrl && (
                      <p
                        id="targetUrl-error"
                        className="text-sm text-destructive"
                        role="alert"
                      >
                        {errors.targetUrl}
                      </p>
                    )}
                  </div>
                )}

              {formData.serviceCategory === "physical" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="locationAddress"
                    className="text-base font-medium"
                  >
                    {t.auditForm.labels.locationAddress}{" "}
                    <span className="text-destructive" aria-label="required">
                      *
                    </span>
                  </Label>
                  <Textarea
                    id="locationAddress"
                    value={formData.locationAddress}
                    onChange={(e) =>
                      updateFormData("locationAddress", e.target.value)
                    }
                    placeholder={t.auditForm.placeholders.locationAddress}
                    className={cn(
                      "min-h-24 text-base",
                      errors.locationAddress && "border-destructive border-2",
                    )}
                    aria-invalid={!!errors.locationAddress}
                    aria-describedby={
                      errors.locationAddress
                        ? "locationAddress-error"
                        : undefined
                    }
                  />
                  {errors.locationAddress && (
                    <p
                      id="locationAddress-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.locationAddress}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 2: Audit Standards & Methodology */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label
                  htmlFor="accessibilityStandard"
                  className="text-base font-medium"
                >
                  {t.auditForm.labels.accessibilityStandard}{" "}
                  <span className="text-destructive" aria-label="required">
                    *
                  </span>
                </Label>
                <Select
                  value={formData.accessibilityStandard}
                  onValueChange={(value) =>
                    updateFormData("accessibilityStandard", value)
                  }
                >
                  <SelectTrigger
                    id="accessibilityStandard"
                    className={cn(
                      "h-12 text-base",
                      errors.accessibilityStandard &&
                        "border-destructive border-2",
                    )}
                    aria-invalid={!!errors.accessibilityStandard}
                    aria-describedby={
                      errors.accessibilityStandard
                        ? "accessibilityStandard-error"
                        : undefined
                    }
                  >
                    <SelectValue placeholder={t.auditForm.placeholders.selectStandard} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wcag-2.1-aa">
                      {t.auditForm.options.wcag21aa}
                    </SelectItem>
                    <SelectItem value="wcag-2.2-aa">
                      {t.auditForm.options.wcag22aa}
                    </SelectItem>
                    <SelectItem value="universal-design">
                      {t.auditForm.options.universalDesign}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.accessibilityStandard && (
                  <p
                    id="accessibilityStandard-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {errors.accessibilityStandard}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">
                  {t.auditForm.labels.servicePackage}{" "}
                  <span className="text-destructive" aria-label="required">
                    *
                  </span>
                </Label>
                <div
                  className="space-y-3"
                  role="radiogroup"
                  aria-invalid={!!errors.servicePackage}
                  aria-describedby={
                    errors.servicePackage ? "servicePackage-error" : undefined
                  }
                >
                  {SERVICE_PACKAGES.map((pkg) => (
                    <Card
                      key={pkg.value}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-2",
                        formData.servicePackage === pkg.value
                          ? "border-accent bg-accent/5"
                          : "border-border",
                      )}
                      onClick={() =>
                        updateFormData("servicePackage", pkg.value)
                      }
                      role="radio"
                      aria-checked={formData.servicePackage === pkg.value}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          updateFormData("servicePackage", pkg.value);
                        }
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start space-x-3">
                          <div
                            className={cn(
                              "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center",
                              formData.servicePackage === pkg.value
                                ? "border-accent bg-accent"
                                : "border-border",
                            )}
                          >
                            {formData.servicePackage === pkg.value && (
                              <div className="h-2.5 w-2.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-base text-foreground">
                              {pkg.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {pkg.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {errors.servicePackage && (
                  <p
                    id="servicePackage-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {errors.servicePackage}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 3: Specific Requirements */}
          {currentStep === 3 && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  {t.auditForm.labels.devicesToTest}{" "}
                  <span className="text-destructive" aria-label="required">
                    *
                  </span>
                </Label>
                <div
                  className="space-y-3"
                  role="group"
                  aria-invalid={!!errors.devices}
                  aria-describedby={
                    errors.devices ? "devices-error" : undefined
                  }
                >
                  {[
                    { value: "desktop", label: t.auditForm.options.desktop },
                    { value: "mobile-ios", label: t.auditForm.options.mobileIos },
                    { value: "mobile-android", label: t.auditForm.options.mobileAndroid },
                    { value: "screen-reader", label: t.auditForm.options.screenReader },
                  ].map((device) => (
                    <div
                      key={device.value}
                      className="flex items-center space-x-3 rounded-md border border-border p-4 hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        id={device.value}
                        checked={formData.devices.includes(device.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFormData("devices", [
                              ...formData.devices,
                              device.value,
                            ]);
                          } else {
                            updateFormData(
                              "devices",
                              formData.devices.filter(
                                (d) => d !== device.value,
                              ),
                            );
                          }
                        }}
                        className="h-5 w-5"
                      />
                      <Label
                        htmlFor={device.value}
                        className="flex-1 cursor-pointer text-base font-normal"
                      >
                        {device.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.devices && (
                  <p
                    id="devices-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {errors.devices}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="specialInstructions"
                  className="text-base font-medium"
                >
                  {t.auditForm.labels.specialInstructions}
                </Label>
                <Textarea
                  id="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={(e) =>
                    updateFormData("specialInstructions", e.target.value)
                  }
                  placeholder={t.auditForm.placeholders.specialInstructions}
                  className="min-h-32 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  {t.auditForm.hints.specialInstructions}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileUpload" className="text-base font-medium">
                  {t.auditForm.labels.fileUpload}
                </Label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="fileUpload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload
                        className="w-10 h-10 mb-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">{t.auditForm.hints.fileUploadClick}</span>{" "}
                        {t.auditForm.hints.fileUploadDragDrop}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.auditForm.hints.fileUploadTypes}
                      </p>
                    </div>
                    <input
                      id="fileUpload"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="sr-only"
                      aria-label={t.auditForm.hints.uploadAriaLabel}
                    />
                  </label>
                </div>
                {formData.files.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {t.auditForm.hints.filesSelected.replace(
                      "{count}",
                      String(formData.files.length),
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 4: Scan Configuration */}
          {currentStep === 4 && (
            <>
              {/* Scan Scope */}
              <div className="space-y-3">
                <Label className="text-base font-medium">{t.auditForm.labels.scanScope}</Label>
                <RadioGroup
                  value={formData.scanScope}
                  onValueChange={(value) =>
                    updateFormData("scanScope", value as "single" | "full_site")
                  }
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 rounded-md border border-border p-4 hover:bg-accent/5 transition-colors">
                    <RadioGroupItem
                      value="single"
                      id="scope-single"
                      className="h-5 w-5"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="scope-single"
                        className="cursor-pointer text-base font-normal"
                      >
                        {t.auditForm.options.singlePage}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.auditForm.options.singlePageDesc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-md border border-border p-4 hover:bg-accent/5 transition-colors">
                    <RadioGroupItem
                      value="full_site"
                      id="scope-full"
                      className="h-5 w-5"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="scope-full"
                        className="cursor-pointer text-base font-normal"
                      >
                        {t.auditForm.options.fullSite}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.auditForm.options.fullSiteDesc}
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {formData.scanScope === "full_site" && (
                <div className="space-y-2">
                  <Label htmlFor="maxPages" className="text-base font-medium">
                    {t.auditForm.labels.maxPages}
                  </Label>
                  <Input
                    id="maxPages"
                    type="number"
                    min={1}
                    max={500}
                    value={formData.maxPages}
                    onChange={(e) =>
                      updateFormData("maxPages", parseInt(e.target.value) || 50)
                    }
                    className="h-12 text-base w-40"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t.auditForm.hints.maxPages}
                  </p>
                </div>
              )}

              {/* Login Configuration */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-3 rounded-md border border-border p-4">
                  <Checkbox
                    id="loginRequired"
                    checked={formData.loginRequired}
                    onCheckedChange={(checked) =>
                      updateFormData("loginRequired", !!checked)
                    }
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor="loginRequired"
                    className="cursor-pointer text-base font-normal"
                  >
                    {t.auditForm.labels.loginRequired}
                  </Label>
                </div>

                {formData.loginRequired && (
                  <div className="space-y-4 pl-4 border-l-2 border-accent/30">
                    <div className="space-y-2">
                      <Label
                        htmlFor="loginUrl"
                        className="text-base font-medium"
                      >
                        {t.auditForm.labels.loginUrl}
                      </Label>
                      <Input
                        id="loginUrl"
                        type="url"
                        value={formData.loginUrl}
                        onChange={(e) =>
                          updateFormData("loginUrl", e.target.value)
                        }
                        placeholder={t.auditForm.placeholders.loginUrl}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="loginUsername"
                          className="text-base font-medium"
                        >
                          {t.auditForm.labels.usernameEmail}
                        </Label>
                        <Input
                          id="loginUsername"
                          value={formData.username}
                          onChange={(e) =>
                            updateFormData("username", e.target.value)
                          }
                          placeholder={t.auditForm.placeholders.username}
                          className="h-12 text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="loginPassword"
                          className="text-base font-medium"
                        >
                          {t.auditForm.labels.password}
                        </Label>
                        <Input
                          id="loginPassword"
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            updateFormData("password", e.target.value)
                          }
                          placeholder={t.auditForm.placeholders.password}
                          className="h-12 text-base"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="usernameField"
                        className="text-base font-medium"
                      >
                        {t.auditForm.labels.usernameFieldSelector}
                      </Label>
                      <Input
                        id="usernameField"
                        value={formData.usernameField}
                        onChange={(e) =>
                          updateFormData("usernameField", e.target.value)
                        }
                        placeholder={t.auditForm.placeholders.usernameField}
                        className="h-12 text-base font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="passwordField"
                        className="text-base font-medium"
                      >
                        {t.auditForm.labels.passwordFieldSelector}
                      </Label>
                      <Input
                        id="passwordField"
                        value={formData.passwordField}
                        onChange={(e) =>
                          updateFormData("passwordField", e.target.value)
                        }
                        placeholder={t.auditForm.placeholders.passwordField}
                        className="h-12 text-base font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="submitSelector"
                        className="text-base font-medium"
                      >
                        {t.auditForm.labels.submitButtonSelector}
                      </Label>
                      <Input
                        id="submitSelector"
                        value={formData.submitSelector}
                        onChange={(e) =>
                          updateFormData("submitSelector", e.target.value)
                        }
                        placeholder={t.auditForm.placeholders.submitSelector}
                        className="h-12 text-base font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              size="lg"
              className="min-w-32 bg-transparent"
            >
              <ChevronLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              {t.auditForm.buttons.previous}
            </Button>
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                size="lg"
                className="min-w-32"
              >
                {t.auditForm.buttons.next}
                <ChevronRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                size="lg"
                className="min-w-32"
              >
                {t.auditForm.buttons.submitRequest}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
