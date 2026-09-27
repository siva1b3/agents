import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import repository


class RepositoryToolsTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "repo"
        self.root.mkdir()
        root_patch = patch.object(repository, "REPOSITORY_ROOT", self.root)
        root_patch.start()
        self.addCleanup(root_patch.stop)
        self.write("src/app.js", "first\nvalidateRequest()\nlast validateRequest()\n")
        self.write("empty.txt", "")
        for name in [".git/config", "node_modules/pkg/index.js", ".env", ".env.local",
                     "src/.env", "docs/evaluator-guide.md"]:
            self.write(name, "SECRET_MARKER")

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def test_listing_is_sorted_relative_and_excludes_restricted_entries(self):
        self.assertEqual(repository.list_files(),
                         ["docs/", "empty.txt", "src/", "src/app.js"])

    def test_read_preserves_original_line_numbers(self):
        self.assertEqual(repository.read_file("src/app.js"),
                         "1: first\n2: validateRequest()\n3: last validateRequest()")
        self.assertEqual(repository.read_file("src/app.js", 2, 2),
                         "2: validateRequest()")
        self.assertEqual(repository.read_file("src/app.js", 3, 99),
                         "3: last validateRequest()")
        self.assertEqual(repository.read_file("empty.txt"), "File is empty.")

    def test_missing_files_and_directories_report_errors(self):
        for path, message in [("missing.js", "does not exist"), ("src", "not a file")]:
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, message):
                repository.read_file(path)

    def test_read_rejects_excluded_paths_and_escapes(self):
        outside = self.root.parent / "outside.txt"
        outside.write_text("SECRET_MARKER", encoding="utf-8")
        for path in ["../outside.txt", str(outside), ".git/config", ".env",
                     ".env.local", "node_modules/pkg/index.js", "docs/evaluator-guide.md"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                repository.read_file(path)
        self.assertEqual(repository.search_code("SECRET_MARKER"), "No matches found.")

    def test_symlink_escapes_exclusions_and_loops(self):
        (self.root / "outside").symlink_to(self.root.parent, target_is_directory=True)
        (self.root / "loop").symlink_to(self.root, target_is_directory=True)
        (self.root / "secret-alias").symlink_to(self.root / ".env")
        for path in ["outside", "loop", "secret-alias"]:
            self.assertNotIn(path, repository.list_files())
            self.assertNotIn(path + "/", repository.list_files())
        for path in ["outside/outside.txt", "secret-alias"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                repository.read_file(path)
        self.assertEqual(repository.search_code("SECRET_MARKER"), "No matches found.")

    def test_search_matches_and_no_matches(self):
        self.assertEqual(repository.search_code("validateRequest"),
                         "src/app.js:2: validateRequest()\nsrc/app.js:3: last validateRequest()")
        for query in ["absent", "VALIDATEREQUEST", ".*"]:
            with self.subTest(query=query):
                self.assertEqual(repository.search_code(query), "No matches found.")

    def test_search_reports_truncation_only_when_more_matches_exist(self):
        self.assertEqual(repository.search_code("validateRequest", 1),
                         "src/app.js:2: validateRequest()\n"
                         "Results limited to 1 matching lines; more matches exist.")
        self.assertNotIn("Results limited", repository.search_code("validateRequest", 2))

    def test_binary_and_non_utf8_files(self):
        for name, data in [("binary", b"validateRequest\x00"),
                           ("non-utf8", b"validateRequest\xff")]:
            (self.root / name).write_bytes(data)
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, "UTF-8"):
                repository.read_file(name)
        self.assertEqual(len(repository.search_code("validateRequest").splitlines()), 2)

    def test_invalid_arguments(self):
        for start, end in [(0, None), (True, None), (4, None), (2, 1), (1, "2")]:
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                repository.read_file("src/app.js", start, end)
        for query in ["", None, "two\nlines"]:
            with self.subTest(query=query), self.assertRaises(ValueError):
                repository.search_code(query)
        for limit in [0, True, "2"]:
            with self.subTest(limit=limit), self.assertRaises(ValueError):
                repository.search_code("validateRequest", limit)

    def test_empty_and_missing_repository(self):
        empty = self.root / "empty-repo"
        empty.mkdir()
        with patch.object(repository, "REPOSITORY_ROOT", empty):
            self.assertEqual(repository.list_files(), [])
            self.assertEqual(repository.search_code("anything"), "No matches found.")
        with patch.object(repository, "REPOSITORY_ROOT", self.root / "missing"):
            with self.assertRaisesRegex(ValueError, "Repository directory does not exist"):
                repository.list_files()


class ActualRepositoryTests(unittest.TestCase):
    def test_validation_citations_match_source(self):
        path = "src/middleware/validate-request.js"
        self.assertIn(path, repository.list_files())
        source = (repository.REPOSITORY_ROOT / path).read_text(encoding="utf-8").splitlines()
        numbered = repository.read_file(path).splitlines()
        self.assertEqual(numbered, [f"{i}: {line}" for i, line in enumerate(source, 1)])
        results = repository.search_code("validateRequest", max_results=1000).splitlines()
        self.assertTrue(any(line.startswith(path + ":") for line in results))
        self.assertTrue(any(line.startswith("src/routes/") for line in results))
        for result in results:
            relative, number, text = result.split(":", 2)
            actual = (repository.REPOSITORY_ROOT / relative).read_text(encoding="utf-8").splitlines()
            self.assertEqual(text, " " + actual[int(number) - 1])


if __name__ == "__main__":
    unittest.main()
