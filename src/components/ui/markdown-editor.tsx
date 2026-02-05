/**
 * Markdown Editor Component
 *
 * A rich Markdown editor with:
 * - Edit/Preview/Split toggle
 * - Fullscreen mode (opens as separate modal)
 * - Formatting toolbar for quick insert
 * - Syntax hints
 */

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Edit3,
    Eye,
    Columns2,
    Maximize2,
    X,
    Bold,
    Italic,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Code,
    Terminal,
    Quote,
    Link,
    Image,
    Minus,
    Table,
    LucideIcon,
} from "lucide-react";

// Markdown components for rendering
const markdownComponents: any = {
  h1: ({ children }: any) => <h1 className="text-2xl font-bold my-3 border-b pb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xl font-bold my-3 border-b pb-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-lg font-semibold my-2">{children}</h3>,
  p: ({ children }: any) => <p className="mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-3 pl-6 list-disc space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-3 pl-6 list-decimal space-y-1">{children}</ol>,
  blockquote: ({ children }: any) => <blockquote className="border-l-4 border-muted pl-4 my-3 italic text-muted-foreground">{children}</blockquote>,
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const isCodeBlock = !!match || (node?.position?.start.line !== node?.position?.end.line);

    return !isCodeBlock ? (
      <code className="bg-muted px-1 rounded text-red-500 font-mono text-sm" {...props}>
        {children}
      </code>
    ) : (
      <code className="block bg-slate-900 dark:bg-slate-800 text-slate-100 p-3 rounded-lg my-3 font-mono text-xs overflow-x-auto" {...props}>
        {children}
      </code>
    );
  },
  a: ({ href, children, ...props }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline" {...props}>{children}</a>,
  table: ({ children }: any) => <div className="overflow-x-auto my-3"><table className="min-w-full border border-border">{children}</table></div>,
  th: ({ children }: any) => <th className="border border-border px-3 py-2 bg-muted">{children}</th>,
  td: ({ children }: any) => <td className="border border-border px-3 py-2">{children}</td>,
};

interface FormattingAction {
    icon: LucideIcon;
    label: string;
    before: string;
    after: string;
    placeholder: string;
    newLine?: boolean;
    type?: never;
}

interface DividerAction {
    type: "divider";
    icon?: never;
    label?: never;
    before?: never;
    after?: never;
    placeholder?: never;
    newLine?: never;
}

type Action = FormattingAction | DividerAction;

// Formatting actions
const FORMATTING_ACTIONS: Action[] = [
    { icon: Bold, label: "Bold", before: "**", after: "**", placeholder: "bold text" },
    { icon: Italic, label: "Italic", before: "*", after: "*", placeholder: "italic text" },
    { icon: Heading1, label: "Heading 1", before: "# ", after: "", placeholder: "Heading 1", newLine: true },
    { icon: Heading2, label: "Heading 2", before: "## ", after: "", placeholder: "Heading 2", newLine: true },
    { icon: Heading3, label: "Heading 3", before: "### ", after: "", placeholder: "Heading 3", newLine: true },
    { type: "divider" },
    { icon: List, label: "Bullet List", before: "- ", after: "", placeholder: "List item", newLine: true },
    { icon: ListOrdered, label: "Numbered List", before: "1. ", after: "", placeholder: "List item", newLine: true },
    { icon: Quote, label: "Quote", before: "> ", after: "", placeholder: "Quote", newLine: true },
    { type: "divider" },
    { icon: Code, label: "Highlight", before: "`", after: "`", placeholder: "code" },
    { icon: Terminal, label: "Code Block", before: "```\n", after: "\n```", placeholder: "code block", newLine: true },
    { icon: Link, label: "Link", before: "[", after: "](url)", placeholder: "link text" },
    { icon: Image, label: "Image", before: "![", after: "](url)", placeholder: "alt text" },
    { type: "divider" },
    { icon: Minus, label: "Horizontal Rule", before: "\n---\n", after: "", placeholder: "" },
    { icon: Table, label: "Table", before: "\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n", after: "", placeholder: "" },
];

// Preview panel component
const PreviewPanel = ({ value, className, style }: { value: string; className?: string; style?: React.CSSProperties }) => (
    <div
        className={cn(
            "px-4 py-3 overflow-y-auto markdown-preview scrollbar-thin",
            "text-sm text-foreground bg-background",
            className
        )}
        style={style}
    >
        {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {value}
            </ReactMarkdown>
        ) : (
            <p className="text-muted-foreground/50 italic">
                Nothing to preview yet...
            </p>
        )}
    </div>
);

// Editor panel component with ref
const EditorPanel = ({
    value,
    onChange,
    placeholder,
    disabled,
    className,
    textareaRef,
    minHeight
}: {
    value: string;
    onChange?: (value: string) => void;
    placeholder: string;
    disabled: boolean;
    className?: string;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    minHeight?: string;
}) => (
    <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
            "w-full h-full px-4 py-3 bg-background text-foreground",
            "placeholder-muted-foreground/50 focus:outline-none",
            "text-sm font-mono resize-none scrollbar-thin",
            className
        )}
        style={{ minHeight }}
    />
);

// Formatting toolbar component
const FormattingToolbar = ({ onFormat, disabled }: { onFormat: (action: FormattingAction) => void; disabled: boolean }) => (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-muted/30 border-b border-border overflow-x-auto">
        {FORMATTING_ACTIONS.map((action, index) => {
            if (action.type === "divider") {
                return (
                    <div
                        key={`divider-${index}`}
                        className="w-px h-5 bg-border mx-1"
                    />
                );
            }
            const Icon = action.icon;
            return (
                <button
                    key={action.label}
                    type="button"
                    onClick={() => onFormat(action)}
                    disabled={disabled}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title={action.label}
                >
                    <Icon className="w-4 h-4" />
                </button>
            );
        })}
    </div>
);

type Mode = "edit" | "preview" | "split";

// Mode toggle toolbar component
const ModeToolbar = ({
    mode,
    setMode,
    disabled,
    isFullscreen,
    onExpandClick,
    onCloseClick
}: {
    mode: Mode;
    setMode: (mode: Mode) => void;
    disabled: boolean;
    isFullscreen: boolean;
    onExpandClick?: () => void;
    onCloseClick?: () => void;
}) => (
    <div className="flex items-center justify-between px-3 py-2 bg-secondary border-b border-border flex-shrink-0">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-background rounded-lg p-0.5 border border-border">
            <button
                type="button"
                onClick={() => setMode("edit")}
                disabled={disabled}
                className={cn(
                    "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5",
                    mode === "edit"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Edit3 className="w-3 h-3" />
                Edit
            </button>
            <button
                type="button"
                onClick={() => setMode("split")}
                className={cn(
                    "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5",
                    mode === "split"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Columns2 className="w-3 h-3" />
                Split
            </button>
            <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                    "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5",
                    mode === "preview"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Eye className="w-3 h-3" />
                Preview
            </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
            {!isFullscreen && onExpandClick && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onExpandClick}
                    className="h-7 w-7 p-0"
                    title="Open in fullscreen"
                >
                    <Maximize2 className="w-4 h-4" />
                </Button>
            )}
            {isFullscreen && onCloseClick && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCloseClick}
                    className="h-7 w-7 p-0"
                    title="Close"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
    </div>
);

// Content area component
const EditorContent = ({
    mode,
    value,
    onChange,
    placeholder,
    disabled,
    textareaRef,
    minHeight
}: {
    mode: Mode;
    value: string;
    onChange?: (value: string) => void;
    placeholder: string;
    disabled: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    minHeight?: string;
}) => {
    // In fullscreen mode, minHeight is undefined, so use h-full
    // In inline mode, minHeight has a value, so constrain to that height
    const isFullscreen = !minHeight;
    const previewHeightClass = isFullscreen ? "h-full" : "";
    const previewStyle = !isFullscreen && minHeight ? { height: minHeight } : {};

    return (
        <div className="flex-1 overflow-hidden flex flex-col h-full">
            {mode === "edit" && (
                <div className="flex-1 h-full">
                    <EditorPanel
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        textareaRef={textareaRef}
                        minHeight={minHeight}
                    />
                </div>
            )}

            {mode === "preview" && (
                <PreviewPanel
                    value={value}
                    className={cn("scrollbar-thin", previewHeightClass)}
                    style={previewStyle}
                />
            )}

            {mode === "split" && (
                <div className="flex h-full flex-1" style={{ minHeight }}>
                    <div className="w-1/2 h-full border-r border-border overflow-hidden">
                        <EditorPanel
                            value={value}
                            onChange={onChange}
                            placeholder={placeholder}
                            disabled={disabled}
                            textareaRef={textareaRef}
                            minHeight={minHeight}
                        />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden">
                        <PreviewPanel
                            value={value}
                            className={previewHeightClass}
                            style={previewStyle}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export interface MarkdownEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    disabled?: boolean;
}

export default function MarkdownEditor({
    value = "",
    onChange,
    placeholder = "Write your content in Markdown...",
    minHeight = "200px",
    disabled = false,
}: MarkdownEditorProps) {
    const [mode, setMode] = useState<Mode>("edit");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Insert formatting at cursor position
    const handleFormat = useCallback((action: FormattingAction, isModal = false) => {
        const ref = isModal ? modalTextareaRef : textareaRef;
        const textarea = ref.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        let insertText: string;
        let newCursorPos: number;

        if (selectedText) {
            // Wrap selected text
            insertText = `${action.before}${selectedText}${action.after}`;
            newCursorPos = start + action.before.length + selectedText.length + action.after.length;
        } else {
            // Insert with placeholder
            const placeholderText = action.placeholder || "";
            insertText = `${action.before}${placeholderText}${action.after}`;
            // Position cursor at placeholder for selection
            newCursorPos = start + action.before.length;
        }

        // Check if newline needed
        let prefix = "";
        if (action.newLine && start > 0 && value[start - 1] !== "\n") {
            prefix = "\n";
        }

        const newValue = value.substring(0, start) + prefix + insertText + value.substring(end);
        onChange?.(newValue);

        // Restore focus and set cursor position
        setTimeout(() => {
            textarea.focus();
            const cursorOffset = prefix.length;
            if (selectedText) {
                textarea.setSelectionRange(newCursorPos + cursorOffset, newCursorPos + cursorOffset);
            } else {
                // Select the placeholder
                const selectStart = start + cursorOffset + action.before.length;
                const selectEnd = selectStart + (action.placeholder?.length || 0);
                textarea.setSelectionRange(selectStart, selectEnd);
            }
        }, 0);
    }, [value, onChange]);

    const showFormatToolbar = mode === "edit" || mode === "split";

    return (
        <>
            {/* Inline Editor */}
            <div
                className="flex flex-col overflow-hidden rounded-xl border border-border"
                style={{ minHeight }}
            >
                <ModeToolbar
                    mode={mode}
                    setMode={setMode}
                    disabled={disabled}
                    isFullscreen={false}
                    onExpandClick={() => setIsModalOpen(true)}
                />
                {showFormatToolbar && (
                    <FormattingToolbar
                        onFormat={(action) => handleFormat(action, false)}
                        disabled={disabled}
                    />
                )}
                <div className="flex-1" style={{ minHeight }}>
                    <EditorContent
                        mode={mode}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        textareaRef={textareaRef}
                        minHeight={minHeight}
                    />
                </div>
            </div>

            {/* Fullscreen Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
                    <ModeToolbar
                        mode={mode}
                        setMode={setMode}
                        disabled={disabled}
                        isFullscreen={true}
                        onCloseClick={() => setIsModalOpen(false)}
                    />
                    {showFormatToolbar && (
                        <FormattingToolbar
                            onFormat={(action) => handleFormat(action, true)}
                            disabled={disabled}
                        />
                    )}
                    <EditorContent
                        mode={mode}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        textareaRef={modalTextareaRef}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
