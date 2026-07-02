import React from "react";
import Banner from "@/components/Banner";

interface PendingApprovalBannerProps {
  type?: "pending" | "suspended";
}

export default function PendingApprovalBanner({ type = "pending" }: PendingApprovalBannerProps) {
  if (type === "pending") {
    return (
      <Banner
        variant="warning"
        title="Pending Approval"
        subtitle="Your church registration is under review. Some features are limited until approved."
      />
    );
  }

  return (
    <Banner
      variant="error"
      title="Account Suspended"
      subtitle="Your church account has been suspended. Please contact support."
    />
  );
}
