import { Card } from "@/components/ui/card";

const HistoryTest = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History Test</h1>
        <p className="text-muted-foreground">This is a test page to verify routing works</p>
      </div>
      
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Test Content</h2>
        <p>If you can see this, the History page routing is working correctly.</p>
      </Card>
    </div>
  );
};

export default HistoryTest;
