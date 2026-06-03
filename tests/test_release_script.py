import sys
from pathlib import Path

# Add scripts directory to sys.path
scripts_dir = Path(__file__).parent.parent / "scripts"
sys.path.append(str(scripts_dir))

from create_release import calculate_next_version


def test_calculate_next_version_no_tags_returns_base():
    date_str = "2026.06.01"
    tags = []
    
    version = calculate_next_version(date_str, tags)
    
    assert version == "v2026.06.01"


def test_calculate_next_version_only_base_tag_returns_patch1():
    date_str = "2026.06.01"
    tags = ["v2026.06.01"]
    
    version = calculate_next_version(date_str, tags)
    
    assert version == "v2026.06.01.patch1"


def test_calculate_next_version_with_patch_returns_patch_incremented():
    date_str = "2026.06.01"
    tags = ["v2026.06.01", "v2026.06.01.patch1"]
    
    version = calculate_next_version(date_str, tags)
    
    assert version == "v2026.06.01.patch2"


def test_calculate_next_version_different_day_returns_base():
    date_str = "2026.06.01"
    tags = ["v2026.05.31", "v2026.05.31.patch1"]
    
    version = calculate_next_version(date_str, tags)
    
    assert version == "v2026.06.01"


def test_calculate_next_version_with_gap_returns_max_incremented():
    date_str = "2026.06.01"
    tags = ["v2026.06.01", "v2026.06.01.patch5"]
    
    version = calculate_next_version(date_str, tags)
    
    assert version == "v2026.06.01.patch6"


def test_calculate_next_version_with_invalid_format_ignored():
    date_str = "2026.06.01"
    tags = ["v2026.06.01.patchabc", "v2026.06.01.patch1.2", "v2026.06.01"]
    
    version = calculate_next_version(date_str, tags)
    
    assert version == "v2026.06.01.patch1"
