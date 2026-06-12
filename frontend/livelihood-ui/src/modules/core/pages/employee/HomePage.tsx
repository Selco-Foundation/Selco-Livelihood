import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui";

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Livelihood UI. Add domain modules under src/modules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            This shell provides auth, layout, routing, and shared infrastructure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Register new modules in src/modules.ts and follow MODULE_TEMPLATE.md.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
