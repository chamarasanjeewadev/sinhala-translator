import type { MDXComponents } from "mdx/types";
import { Link } from "next-view-transitions";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="text-3xl md:text-4xl font-bold mt-12 mb-6 text-foreground" {...props} />
    ),
    h2: (props) => (
      <h2 className="text-2xl md:text-3xl font-semibold mt-10 mb-4 text-foreground/90" {...props} />
    ),
    h3: (props) => (
      <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-4 text-foreground/90" {...props} />
    ),
    p: (props) => (
      <p className="text-lg leading-relaxed mb-6 text-muted-foreground" {...props} />
    ),
    ul: (props) => (
      <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-muted-foreground" {...props} />
    ),
    ol: (props) => (
      <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-muted-foreground" {...props} />
    ),
    li: (props) => <li className="pl-2" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="border-l-4 border-primary pl-6 py-2 my-8 italic text-lg text-muted-foreground bg-muted/30 rounded-r-lg"
        {...props}
      />
    ),
    a: ({ href, ...props }: any) => {
      if (href?.startsWith("/")) {
        return (
          <Link
            href={href}
            className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/80 transition-all font-medium"
            {...props}
          />
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/80 transition-all font-medium"
          {...props}
        />
      );
    },
    img: (props: any) => (
      <div className="my-8 rounded-xl overflow-hidden shadow-lg border border-border/50">
        <img
          {...props}
          className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500"
        />
        {props.alt && (
          <p className="text-sm text-center text-muted-foreground mt-2 px-4 pb-2 bg-muted/20 italic">
            {props.alt}
          </p>
        )}
      </div>
    ),
    hr: (props) => <hr className="my-12 border-border" {...props} />,
    code: (props) => (
      <code
        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border border-border/50"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="bg-muted/50 p-6 rounded-xl overflow-x-auto my-8 border border-border/50 text-sm font-mono"
        {...props}
      />
    ),
    ...components,
  };
}
