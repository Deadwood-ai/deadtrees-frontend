import React, { useState, useEffect } from "react";
import { Alert, Button, Space, Typography } from "antd";
import { initializePostHog, COOKIE_CONSENT_VERSION } from "../../utils/analytics";

const { Text, Link } = Typography;

// Access the global posthog instance
declare const posthog: any;

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given with the current version
    const consent = localStorage.getItem("cookieConsent");
    const version = localStorage.getItem("cookieConsentVersion");

    // Show banner if no consent or outdated version
    if (consent && version === COOKIE_CONSENT_VERSION) {
      initializePostHog(consent);
    } else {
      // Clear previous consent if version is outdated
      if (consent && version !== COOKIE_CONSENT_VERSION) {
        // If they previously opted out, keep that preference
        if (posthog && posthog.has_opted_out_capturing) {
          localStorage.setItem("cookieConsent", "rejected");
          localStorage.setItem("cookieConsentVersion", COOKIE_CONSENT_VERSION);
          initializePostHog("rejected");
          return;
        }
      }

      setIsVisible(true);
      // Initialize with limited functionality for users who haven't decided yet
      initializePostHog("pending");
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    localStorage.setItem("cookieConsentVersion", COOKIE_CONSENT_VERSION);
    initializePostHog("accepted");
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    localStorage.setItem("cookieConsentVersion", COOKIE_CONSENT_VERSION);
    initializePostHog("rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Alert
      className="fixed bottom-0 left-0 right-0 z-50 m-4 rounded-lg p-4 shadow-lg"
      type="info"
      showIcon={false}
      banner
      message={
        <div className="flex w-full flex-col items-start justify-between md:flex-row md:items-center">
          <div className="mb-2 flex-1 md:mb-0 md:mr-4">
            <Text>
              This website uses cookies for analytics to help us improve our services. Your data helps us understand how
              the site is used and how we can improve it.{" "}
              <Link href="/datenschutzerklaerung" target="_blank">
                Privacy Policy
              </Link>
            </Text>
          </div>
          <Space>
            <Button onClick={handleReject} type="default">
              Reject
            </Button>
            <Button onClick={handleAccept} type="primary">
              Accept
            </Button>
          </Space>
        </div>
      }
    />
  );
}
