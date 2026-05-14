<p align="center">
  <img src="assets/banner.png" alt="Aegis Spec" width="100%">
</p>

# Aegis Spec

**Turn legacy systems into executable specifications for AI agents.**

You know that system nobody wants to touch? The one that's been running for 10 years, makes money every day, but nobody really knows what it does on the inside? Aegis Spec was built for it.

---

## What is Aegis Spec?

Aegis Spec is a specification reverse-engineering framework. You install it inside a legacy project, activate an AI agent you already use, and it coordinates a team of specialists to analyze the code and generate complete, traceable, ready-to-use specifications for any coding agent.

**In other words:** Aegis Spec turns undocumented code into operational contracts that an AI agent can understand and use to safely evolve the system.

---

## Quick start

In the root of the legacy project:

```bash
npx aegis-spec install
```

Then open the project in your favorite AI agent and type:

```
/aegis
```

That's it. Aegis Spec takes the wheel and guides you to the end.

---

## What you'll find here

<div class="grid cards" markdown>

- **Why Aegis Spec exists**

    The problem it solves and why it matters.

    [:octicons-arrow-right-24: Read more](por-que-aegis.md)

- **Installation**

    Two minutes and you're ready to go.

    [:octicons-arrow-right-24: Install](instalacao.md)

- **Analysis pipeline**

    The 5 phases that turn code into specification.

    [:octicons-arrow-right-24: See pipeline](pipeline.md)

- **Agents**

    Meet the team: 14 specialists, each with their own role.

    [:octicons-arrow-right-24: See agents](agentes/index.md)

</div>

---

## Safety guarantee

!!! danger "💾 Back up your project before starting"
    Although Aegis Spec never modifies your files, AI agents can make mistakes. **We strongly recommend:**

    1. **Version the project in Git** — make sure all files are committed before starting the analysis
    2. **Have the repository on GitHub** (or GitLab, Bitbucket) — so you have a safe remote copy
    3. **Make a local copy of the folder** — a simple `cp -r my-project my-project-backup` protects against any unexpected event

    If something unexpected happens during analysis, you can restore the original state with `git restore .` or from the backup copy.

!!! warning "Aegis Spec never touches your files"
    Agents write **only** to `aegis/` and `aegis/`. No file in your project is modified, deleted, or overwritten. Ever.

!!! info "No API keys"
    Aegis Spec does not request, store, or transmit API keys from any service. The intelligence comes from the agent you already use in your environment.
