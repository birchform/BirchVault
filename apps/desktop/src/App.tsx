import { Shield } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">BirchVault Desktop</h1>
        <p className="text-muted-foreground">
          Desktop application coming soon...
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          The desktop app shares the same codebase as the web app.
          <br />
          Full implementation pending.
        </p>
      </div>
    </div>
  );
}

export default App;







