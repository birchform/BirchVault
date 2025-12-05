import { useEffect, useRef, useState } from 'react';
import { Trash2, Download, ArrowDown, Clock, Filter } from 'lucide-react';
import { useRunnerStore, LogEntry } from '../store/useRunnerStore';

interface LogViewerProps {
  maxHeight?: string;
  showControls?: boolean;
}

export default function LogViewer({
  maxHeight = 'h-96',
  showControls = true,
}: LogViewerProps) {
  const { output, outputStrings, clearOutput } = useRunnerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  
  // Enhanced state
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [showLineNumbers] = useState(true);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (containerRef.current && autoScrollRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // If user scrolls up, disable auto-scroll
      autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      autoScrollRef.current = true;
    }
  };

  const downloadLogs = () => {
    const content = outputStrings.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runner-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter output based on showErrorsOnly
  const filteredOutput = showErrorsOnly
    ? output.filter(entry => entry.level === 'error' || entry.level === 'warning')
    : output;

  const formatLine = (entry: LogEntry, index: number) => {
    const isError = entry.level === 'error';
    const isWarning = entry.level === 'warning';
    const isSuccess =
      entry.message.includes('Connected') ||
      entry.message.includes('Listening') ||
      entry.message.includes('completed');
    const isJobStart = entry.message.includes('Running job');

    let className = 'text-github-text';
    if (isError) className = 'text-github-danger';
    else if (isWarning) className = 'text-github-warning';
    else if (isSuccess) className = 'text-github-accent';
    else if (isJobStart) className = 'text-github-info';

    // Format timestamp
    const timestamp = showTimestamps
      ? new Date(entry.timestamp).toLocaleTimeString()
      : null;

    return (
      <div
        key={index}
        className={`${className} hover:bg-github-border/30 px-2 font-mono text-sm leading-relaxed ${
          isError ? 'bg-github-danger/10' : isWarning ? 'bg-github-warning/10' : ''
        }`}
      >
        {showLineNumbers && (
          <span className="text-github-muted/50 select-none mr-4 inline-block w-8 text-right">
            {index + 1}
          </span>
        )}
        {showTimestamps && timestamp && (
          <span className="text-github-muted/70 mr-3">[{timestamp}]</span>
        )}
        <span
          className={`mr-2 text-xs font-medium ${
            isError ? 'text-github-danger' : isWarning ? 'text-github-warning' : 'text-github-muted'
          }`}
        >
          [{entry.level.toUpperCase()}]
        </span>
        {entry.message}
      </div>
    );
  };

  return (
    <div className="bg-github-surface rounded-xl border border-github-border overflow-hidden">
      {showControls && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-github-border bg-github-bg">
          <h3 className="text-sm font-medium text-github-text">Console Output</h3>
          <div className="flex items-center gap-1">
            {/* Timestamp Toggle */}
            <button
              onClick={() => setShowTimestamps(!showTimestamps)}
              className={`p-2 rounded-lg transition-colors ${
                showTimestamps
                  ? 'bg-github-accent/20 text-github-accent'
                  : 'text-github-muted hover:text-github-text hover:bg-github-border'
              }`}
              title={showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
            >
              <Clock className="w-4 h-4" />
            </button>
            
            {/* Error Filter Toggle */}
            <button
              onClick={() => setShowErrorsOnly(!showErrorsOnly)}
              className={`p-2 rounded-lg transition-colors ${
                showErrorsOnly
                  ? 'bg-github-danger/20 text-github-danger'
                  : 'text-github-muted hover:text-github-text hover:bg-github-border'
              }`}
              title={showErrorsOnly ? 'Show all logs' : 'Show errors only'}
            >
              <Filter className="w-4 h-4" />
            </button>
            
            <div className="w-px h-4 bg-github-border mx-1" />
            
            <button
              onClick={scrollToBottom}
              className="p-2 hover:bg-github-border rounded-lg transition-colors text-github-muted hover:text-github-text"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={downloadLogs}
              disabled={output.length === 0}
              className="p-2 hover:bg-github-border rounded-lg transition-colors text-github-muted hover:text-github-text disabled:opacity-50"
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clearOutput}
              disabled={output.length === 0}
              className="p-2 hover:bg-github-border rounded-lg transition-colors text-github-muted hover:text-github-danger disabled:opacity-50"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`${maxHeight} overflow-auto bg-github-bg p-4 terminal-output`}
      >
        {filteredOutput.length === 0 ? (
          <div className="text-github-muted text-center py-8">
            {showErrorsOnly && output.length > 0
              ? 'No errors found in the logs.'
              : 'No output yet. Start the runner to see logs here.'}
          </div>
        ) : (
          filteredOutput.map(formatLine)
        )}
      </div>
    </div>
  );
}
