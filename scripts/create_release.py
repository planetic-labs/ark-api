#!/usr/bin/env python3
import argparse
import datetime
import re
import subprocess
import sys


def get_current_date() -> str:
    """Returns current date formatted as YYYY.MM.DD."""
    return datetime.datetime.now(datetime.UTC).strftime("%Y.%m.%d")


def run_git_command(args: list[str]) -> str:
    """Runs a git command and returns its stdout as string."""
    try:
        result = subprocess.run(
            ["git"] + args, capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(
            f"Error running git command {' '.join(args)}: {e.stderr}", file=sys.stderr
        )
        raise


def is_git_clean() -> bool:
    """Checks if git working tree is clean."""
    status = run_git_command(["status", "--porcelain"])
    return len(status) == 0


def get_matching_tags(date_str: str) -> list[str]:
    """Gets all tags matching the pattern vYYYY.MM.DD*."""
    try:
        tags_raw = run_git_command(["tag", "-l", f"v{date_str}*"])
        if not tags_raw:
            return []
        return tags_raw.splitlines()
    except subprocess.CalledProcessError:
        return []


def calculate_next_version(date_str: str, tags: list[str]) -> str:
    """Calculates the next CalVer tag.
    - First release: vYYYY.MM.DD
    - Subsequent releases: vYYYY.MM.DD.patchX (where X starts at 1)
    """
    if not tags:
        return f"v{date_str}"

    patch_numbers = []
    base_pattern = re.compile(rf"^v{re.escape(date_str)}$")
    patch_pattern = re.compile(rf"^v{re.escape(date_str)}\.patch(\d+)$")

    for tag in tags:
        if base_pattern.match(tag):
            patch_numbers.append(0)
        else:
            match = patch_pattern.match(tag)
            if match:
                patch_numbers.append(int(match.group(1)))

    if not patch_numbers:
        return f"v{date_str}"

    next_patch = max(patch_numbers) + 1
    if next_patch == 0:
        return f"v{date_str}"
    return f"v{date_str}.patch{next_patch}"


def group_commits(commits: list[str]) -> str:
    """Groups commit messages by standard conventional commit prefixes."""
    categories: dict[str, list[str]] = {
        "Features": [],
        "Bug Fixes": [],
        "Refactoring & Performance": [],
        "Other Changes": [],
    }
    for c in commits:
        c = c.strip()
        if not c:
            continue
        if c.startswith("feat"):
            categories["Features"].append(c)
        elif c.startswith("fix"):
            categories["Bug Fixes"].append(c)
        elif c.startswith(("refactor", "perf")):
            categories["Refactoring & Performance"].append(c)
        else:
            categories["Other Changes"].append(c)

    res: list[str] = []
    for cat, items in categories.items():
        if items:
            res.append(f"\n### {cat}")
            res.extend(f"* {item}" for item in items)
    return "\n".join(res).strip()


def get_changelog() -> str:
    """Generates a grouped changelog from the latest tag to HEAD."""
    try:
        latest_tag: str = run_git_command(["describe", "--tags", "--abbrev=0"])
        log_range: str = f"{latest_tag}..HEAD"
    except Exception:
        log_range = "HEAD"

    try:
        commits: list[str] = run_git_command(
            ["log", log_range, "--pretty=format:%s"]
        ).splitlines()
    except Exception:
        commits = []

    if not commits:
        return "No changes."
    return group_commits(commits)


def create_tag(version: str, changelog: str, dry_run: bool) -> None:
    """Creates a local git tag with changelog message."""
    msg: str = f"Release {version}\n\n{changelog}"
    print(f"Creating local git tag: {version}")
    if dry_run:
        print(f"[DRY-RUN] git tag -a {version} -m '{msg}'")
    else:
        run_git_command(["tag", "-a", version, "-m", msg])
        print(f"Successfully created tag {version} locally.")
        print(f"Changelog included in tag:\n{changelog}\n")


def push_tag(version: str, dry_run: bool) -> None:
    """Pushes a git tag to remote origin."""
    print(f"Pushing tag {version} to origin...")
    if dry_run:
        print(f"[DRY-RUN] git push origin {version}")
    else:
        run_git_command(["push", "origin", version])
        print(f"Successfully pushed tag {version} to origin.")


def create_github_release(version: str, changelog: str, dry_run: bool) -> None:
    """Creates a GitHub release using the gh CLI tool."""
    print(f"Creating GitHub release for tag {version}...")
    cmd = [
        "gh",
        "release",
        "create",
        version,
        "--title",
        f"Release {version}",
        "--notes",
        changelog,
    ]
    if dry_run:
        print(f"[DRY-RUN] {' '.join(cmd)}")
    else:
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"Successfully created GitHub release {version}.")
        except subprocess.CalledProcessError as e:
            print(f"Error creating GitHub release: {e.stderr}", file=sys.stderr)
            raise


def parse_arguments() -> argparse.Namespace:
    """Parses command line arguments."""
    parser = argparse.ArgumentParser(
        description="Create a calendar versioned (CalVer) release."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Calculate version and print commands without executing them.",
    )
    parser.add_argument(
        "--allow-dirty",
        action="store_true",
        help="Allow creating release even if there are uncommitted changes.",
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Automatically push tag to origin without asking.",
    )
    parser.add_argument(
        "--no-input",
        action="store_true",
        help="Do not ask for user input. Safe for automation.",
    )
    return parser.parse_args()


def main():
    args = parse_arguments()

    if not args.allow_dirty and not is_git_clean():
        print(
            "Error: Git working tree is dirty. "
            "Commit or stash your changes, or use --allow-dirty.",
            file=sys.stderr,
        )
        sys.exit(1)

    date_str = get_current_date()
    tags = get_matching_tags(date_str)
    next_version = calculate_next_version(date_str, tags)

    print(f"Current Date: {date_str}")
    print(f"Next release version: {next_version}")

    changelog = get_changelog()
    create_tag(next_version, changelog, args.dry_run)

    if args.dry_run:
        create_github_release(next_version, changelog, args.dry_run)
        return

    if args.push:
        push_tag(next_version, args.dry_run)
        create_github_release(next_version, changelog, args.dry_run)
    elif not args.no_input:
        try:
            user_input = (
                input(
                    f"Do you want to push tag '{next_version}' "
                    "and create GitHub release? [y/N]: "
                )
                .strip()
                .lower()
            )
            if user_input in ("y", "yes"):
                push_tag(next_version, args.dry_run)
                create_github_release(next_version, changelog, args.dry_run)
            else:
                print(
                    "Tag was not pushed. You can push it manually: "
                    f"git push origin {next_version}"
                )
        except KeyboardInterrupt:
            print("\nAborted pushing. Tag was created locally.")
            sys.exit(1)


if __name__ == "__main__":
    main()
