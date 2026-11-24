import pytest
from pathlib import Path


def test_dockerfile_no_seed_in_cmd():
    dockerfile_path = Path("Dockerfile")
    assert dockerfile_path.exists()
    content = dockerfile_path.read_text(encoding="utf-8")
    assert "CMD" in content
    assert "seed_students" not in content


def test_clear_migration_exists():
    mig_path = Path("migrations/versions/007_clear_students_and_grades.py")
    assert mig_path.exists()
    content = mig_path.read_text(encoding="utf-8")
    assert "007_clear_students_and_grades" in content
    assert '"students"' in content
    assert '"grades"' in content
    assert "DELETE FROM" in content


def test_clear_data_script_exists():
    script_path = Path("scripts/clear_data.py")
    assert script_path.exists()
    content = script_path.read_text(encoding="utf-8")
    assert "backup_before_clear" in content
    assert '"students"' in content
    assert "DELETE FROM" in content


def test_clear_grades_migration_and_script():
    mig_path = Path("migrations/versions/009_clear_grades_keep_students.py")
    assert mig_path.exists()
    content_mig = mig_path.read_text(encoding="utf-8")
    assert "009_clear_grades_keep_students" in content_mig
    assert '"grades"' in content_mig
    assert "DELETE FROM" in content_mig

    script_path = Path("scripts/clear_grades_only.py")
    assert script_path.exists()
    content_scr = script_path.read_text(encoding="utf-8")
    assert "backup_before_wipe" in content_scr
    assert "wipe_grades_and_lessons" in content_scr
    assert "Inson.7" in content_scr
