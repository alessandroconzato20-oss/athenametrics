import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const COOKIE_KEY = "cofactor_cookie_consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: true, timestamp: new Date().toISOString() }));
    setVisible(false);
  };

  const essentialOnly = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: false, timestamp: new Date().toISOString() }));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed bottom-0 inset-x-0 z-50 p-4"
        >
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <Cookie className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  We use <strong>essential cookies</strong> for authentication and session management. No tracking or advertising cookies.{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={accept} className="rounded-xl bg-gradient-primary text-primary-foreground">
                    Accept All
                  </Button>
                  <Button size="sm" variant="outline" onClick={essentialOnly} className="rounded-xl">
                    Essential Only
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
