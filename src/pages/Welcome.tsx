import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import athenaLogo from "@/assets/athena-logo.png";

const Welcome = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md flex flex-col items-center text-center"
      >
        <motion.img
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 0.15 }}
          src={athenaLogo}
          alt="Athena Metrics"
          className="mb-8 h-40 w-40 object-contain"
        />

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight max-w-sm"
        >
          Wisdom begins with entry.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-2 text-2xl md:text-3xl font-bold text-muted-foreground leading-tight max-w-sm"
        >
          From entry, understanding emerges.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-10 w-full space-y-3"
        >
          <Link to="/signup" className="block">
            <Button className="h-13 w-full rounded-xl bg-gradient-primary text-base font-semibold uppercase tracking-wide text-primary-foreground py-3.5">
              Create Account, Understand Yourself Better
            </Button>
          </Link>
          <Link to="/login" className="block">
            <Button
              variant="outline"
              className="h-13 w-full rounded-xl border-2 border-primary text-primary text-base font-semibold uppercase tracking-wide hover:bg-primary hover:text-primary-foreground transition-colors py-3.5"
            >
              Log In, Return to Your Insights
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-xs text-muted-foreground"
        >
          University staff?{" "}
          <Link to="/university-login" className="font-medium text-primary hover:underline">
            Access the admin panel →
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Welcome;
