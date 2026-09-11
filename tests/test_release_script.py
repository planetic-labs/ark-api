import subprocess
from pathlib import Path


def test_release_script_is_valid_bash_and_targets_ark_workflow():
    project_root = Path(__file__).parent.parent
    script = project_root / "scripts" / "release.sh"

    subprocess.run(["bash", "-n", script], check=True)
    contents = script.read_text()

    assert "planetic-labs/ark-api" in contents
    assert "build-docker.yml" in contents
    assert 'RELEASE_BRANCH="release/${VERSION}"' in contents
    assert "--auto --squash --delete-branch" in contents
    assert 'gh run watch "$RUN_ID"' in contents
