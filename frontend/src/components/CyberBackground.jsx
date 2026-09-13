export function CyberBackground() {
  return (
    <>
      <div className="fixed inset-0 cyber-grid z-0" />
      <div
        className="ambient-blob"
        style={{
          top: "-10%",
          right: "-10%",
          width: 500,
          height: 500,
          background: "rgba(0,240,255,0.10)",
        }}
      />
      <div
        className="ambient-blob"
        style={{
          bottom: "5%",
          left: "-10%",
          width: 600,
          height: 600,
          background: "rgba(208,0,255,0.10)",
        }}
      />
    </>
  );
}
