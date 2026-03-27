import { Injectable } from '@nestjs/common';

export interface TemplateContext {
  secrets: Record<string, string>;
  services: Record<string, Record<string, string>>;
  project: { name: string; slug: string };
  environment: { name: string };
  deployment: { commit_sha?: string; commit_short?: string };
  server: { host?: string; name?: string };
}

@Injectable()
export class TemplateEngine {
  /**
   * Resolve all {{...}} templates in a map of env vars.
   * Supports: {{secrets.KEY}}, {{services.name.field}}, {{project.name}}, etc.
   * Use \{{ to escape a literal {{.
   */
  resolveAll(
    envVars: Record<string, string>,
    context: TemplateContext,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(envVars)) {
      result[key] = this.resolve(value, context);
    }
    return result;
  }

  resolve(template: string, context: TemplateContext): string {
    const PLACEHOLDER = 'VESTA_ESCAPED_OPEN';
    const escaped = template.replaceAll('\\{{', PLACEHOLDER);

    const resolved = escaped.replaceAll(
      /\{\{([^}]+)\}\}/g,
      (match, expr: string) => {
        const trimmed = expr.trim();
        return this.resolveExpression(trimmed, context) ?? match;
      },
    );

    return resolved.replaceAll(PLACEHOLDER, '{{');
  }

  private resolveExpression(
    expr: string,
    context: TemplateContext,
  ): string | undefined {
    const parts = expr.split('.');
    if (parts.length < 2) return undefined;

    const [namespace, ...rest] = parts;

    switch (namespace) {
      case 'secrets':
        return context.secrets[rest.join('.')];
      case 'services': {
        const [serviceName, field] = rest;
        return context.services[serviceName]?.[field];
      }
      case 'project':
        return (context.project as Record<string, string>)[rest[0]];
      case 'environment':
        return (context.environment as Record<string, string>)[rest[0]];
      case 'deployment':
        return (context.deployment as Record<string, string | undefined>)[
          rest[0]
        ];
      case 'server':
        return (context.server as Record<string, string | undefined>)[rest[0]];
      default:
        return undefined;
    }
  }

  /**
   * Validate templates — return list of unresolvable references.
   */
  validate(
    template: string,
    availableKeys: {
      secrets: string[];
      services: Record<string, string[]>;
    },
  ): string[] {
    const errors: string[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
      const expr = match[1].trim();
      const parts = expr.split('.');
      if (parts[0] === 'secrets' && !availableKeys.secrets.includes(parts[1])) {
        errors.push(`Unknown secret: ${parts[1]}`);
      }
      if (parts[0] === 'services') {
        const svc = parts[1];
        if (!availableKeys.services[svc]) {
          errors.push(`Unknown service: ${svc}`);
        } else if (
          parts[2] &&
          !availableKeys.services[svc].includes(parts[2])
        ) {
          errors.push(`Unknown field ${parts[2]} on service ${svc}`);
        }
      }
    }
    return errors;
  }
}
