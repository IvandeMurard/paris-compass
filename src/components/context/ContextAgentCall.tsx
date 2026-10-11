/**
 * « La même réponse pour un agent » — w6-contexte (#119), step 6.
 *
 * `docs/PERIMETRE.md` §1 ends on *« Si le courtier a besoin de Compass, il utilisera la même
 * chose que l'agent : l'API. »* The MCP server has been published for weeks and serves sourced
 * sentences; the screen said so nowhere. This block is where it says so, and it says it with an
 * invocation rather than a paragraph.
 *
 * **Nothing here is typed by hand.** The tool name, the parameter names and the default vintage
 * come from `src/core/agentCall.ts`, and the coordinates from the point this sheet was scored
 * on. `mcp-server/src/verify.ts` asserts against the live server that the registered tool bears
 * that name and those parameters, so what a visitor copies is checked every morning rather than
 * hoped for.
 */

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AgentCall } from '@/core';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';

// `unknown` rather than a generic: the page passes one of two call shapes, and a generic
// component narrows to whichever branch TypeScript sees first. Nothing here reads a field of
// the arguments — they are serialised whole — so the type only has to carry them.
const ContextAgentCall = ({ call }: { call: AgentCall<unknown> }) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];
  const [copied, setCopied] = useState(false);
  const body = JSON.stringify(call.arguments, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(call, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // A denied clipboard is not an error worth a dialog: the JSON is on screen and
      // selectable, which is the fallback every browser still guarantees.
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="agent-call" className="rounded-lg border bg-white p-5">
      <h2 id="agent-call" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {c.agentHeading}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{c.agentIntro}</p>

      <dl className="mt-3 text-sm">
        <dt className="font-medium">
          {c.agentTool}
          {c.colon}
        </dt>
        <dd>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{call.tool}</code>
        </dd>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {c.agentArguments}
          {c.colon}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check size={14} className="mr-1" aria-hidden /> : <Copy size={14} className="mr-1" aria-hidden />}
          JSON
        </Button>
      </div>
      {/* Wide code must scroll inside its own box; the page itself never scrolls sideways. */}
      <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
        {body}
      </pre>

      <p className="mt-2 text-xs text-muted-foreground">{c.agentNote}</p>
    </section>
  );
};

export default ContextAgentCall;
