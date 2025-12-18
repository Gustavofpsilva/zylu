"use client";

import { motion } from "framer-motion";

type HeaderInfo = {
  title: string;
  subtitle: string;
  description: string;
};

export default function SectionHeader({ headerInfo }: { headerInfo: HeaderInfo }) {
  const { title, subtitle, description } = headerInfo;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: -12 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      whileInView="visible"
      transition={{ duration: 0.6, delay: 0.05 }}
      viewport={{ once: true }}
      className="mx-auto text-center"
    >
      <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
        <span className="text-xs font-semibold tracking-wide text-[#1E2A5A]">
          {title}
        </span>
      </div>

      <h2 className="mx-auto mb-3 text-3xl font-bold text-slate-900 md:w-4/5 xl:w-1/2">
        {subtitle}
      </h2>

      <p className="mx-auto text-sm text-slate-600 md:w-4/5 lg:w-3/5 xl:w-[46%]">
        {description}
      </p>
    </motion.div>
  );
}
