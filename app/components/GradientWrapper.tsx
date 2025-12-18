export default function GradientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-full bg-gradient-to-b from-[#0000FF]/8 to-[#FFFFFF] py-16 px-4">
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}
