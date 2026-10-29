#!/usr/bin/env python3
"""Deterministically check Git checkpoint conditions before a workflow transition."""

from __future__ import annotations

import argparse
import subprocess
import sys


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", required=True, help="stage being closed")
    parser.add_argument("--path", action="append", default=[], help="exact deliverable path; repeat as needed")
    parser.add_argument("--verification", choices=("pass", "na", "pending", "fail"), required=True)
    parser.add_argument("--verification-reason")
    parser.add_argument("--review", choices=("pass", "na", "pending", "fail"), required=True)
    parser.add_argument("--review-reason")
    parser.add_argument("--approval", choices=("approved", "na", "pending", "rejected"), required=True)
    parser.add_argument("--approval-reason")
    parser.add_argument("--checkpoint", action="append", default=[], help="checkpoint commit; repeat to cover a stage split across logical commits")
    parser.add_argument("--no-change", action="store_true", help="stage has no persistent file changes")
    args = parser.parse_args()

    errors: list[str] = []
    for label, state, reason in (
        ("Verification", args.verification, args.verification_reason),
        ("Review", args.review, args.review_reason),
        ("Human Approval", args.approval, args.approval_reason),
    ):
        accepted = {"pass", "na"} if label != "Human Approval" else {"approved", "na"}
        if state not in accepted:
            errors.append(f"{label} is {state}; complete it before transition.")
        if state == "na" and not reason:
            errors.append(f"{label}=na requires an explicit reason.")

    if args.no_change:
        if args.path or args.checkpoint:
            errors.append("--no-change cannot be combined with --path or --checkpoint.")
    elif not args.path:
        errors.append("Provide exact --path values, or use --no-change when there are no persistent changes.")
    elif not args.checkpoint:
        errors.append("At least one --checkpoint commit is required when deliverable paths are provided.")

    if args.path and args.checkpoint:
        try:
            committed: set[str] = set()
            head = git("rev-parse", "HEAD").strip()
            checkpoints = [git("rev-parse", "--verify", f"{value}^{{commit}}").strip() for value in args.checkpoint]
            for checkpoint in checkpoints:
                git("merge-base", "--is-ancestor", checkpoint, head)
                committed.update(git("diff-tree", "--root", "--no-commit-id", "--name-only", "-r", checkpoint).splitlines())
            for path in args.path:
                if path not in committed:
                    errors.append(f"No supplied checkpoint commit contains deliverable path: {path}")
            changed = set(git("status", "--porcelain", "--", *args.path).splitlines())
            if changed:
                errors.append("Deliverable paths have changes after the checkpoint: " + ", ".join(sorted(args.path)))
        except RuntimeError as exc:
            errors.append(str(exc))

    if errors:
        print(f"BLOCKED: {args.stage} transition")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"PASS: {args.stage} transition checkpoint conditions satisfied.")
    print("Verification/Review/Approval states were supplied by Workflow and are not independently inferred by Git.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
