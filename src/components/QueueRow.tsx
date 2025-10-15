import { useCounterAnimation } from "@/hooks/use-counter-animation";

interface QueueRowProps {
  rank: number;
  name: string;
  tenureMonths: number;
  status: string;
  isCurrentUser?: boolean;
  index: number;
}

export const QueueRow = ({ rank, name, tenureMonths, status, isCurrentUser, index }: QueueRowProps) => {
  const animatedRank = useCounterAnimation<HTMLTableRowElement>(rank, 800, index * 100);
  const animatedMonths = useCounterAnimation<HTMLTableRowElement>(tenureMonths, 1000, index * 100 + 50);

  return (
    <tr
      className={`border-b border-border/50 hover:bg-accent/5 transition-colors ${
        isCurrentUser ? "border-l-4 border-l-accent bg-accent/10 pulse-glow" : ""
      }`}
      ref={animatedRank.ref}
    >
      <td className="py-4 font-mono">{animatedRank.count}</td>
      <td className="py-4 font-medium">{name}</td>
      <td className="py-4">{animatedMonths.count} months</td>
      <td className="py-4">
        <span className="px-2 py-1 rounded-full bg-success/20 text-success text-xs">
          {status}
        </span>
      </td>
    </tr>
  );
};
