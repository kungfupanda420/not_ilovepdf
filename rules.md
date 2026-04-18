# Pull Request Rules

This document outlines the guidelines and requirements for submitting pull requests to this project.

## Branch Naming

Use descriptive branch names that clearly indicate the purpose of the changes:

- `feature/description-of-feature`
- `fix/description-of-bug`
- `docs/description-of-documentation`
- `refactor/description-of-refactor`

Avoid generic names like `update` or `changes`.

## Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
- `feat(pdf): add PDF compression tool`
- `fix(image): resolve resize tool memory leak`
- `docs(readme): update installation instructions`

## Pull Request Requirements

### Title
- Use clear, descriptive titles
- Follow the same format as commit messages
- Keep it under 50 characters

### Description
- Explain what the PR does and why
- Reference any related issues
- Include screenshots for UI changes
- List any breaking changes

### Code Quality
<!-- - Ensure all tests pass -->
<!-- - Run `pnpm lint` and fix any issues1 -->
- Follow TypeScript best practices
- Maintain consistent code style
- Add/update JSDoc comments for new functions

### Testing
<!-- - Add unit tests for new features++ -->
<!-- - Update existing tests if behavior changes -->
- Test manually in the browser
- Verify on different screen sizes (responsive design)

### Documentation
- Update README.md if needed
- Add comments for complex logic
<!-- - Update API documentation if applicable -->

### Review Process
- Request review from at least one maintainer
- Address all review comments
- Keep PRs focused on a single feature/fix
- Rebase and squash commits before merging

### Checklist
Before submitting:
- [ ] Code compiles without errors
<!-- - [ ] All tests pass -->
<!-- - [ ] Linting passes -->
<!-- - [ ] Documentation updated -->
<!-- - [ ] Manual testing completed -->
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### Merging
- Squash and merge for feature branches
- Rebase and merge for maintenance branches
- Delete branch after merge

<!-- ## Questions? -->
<!-- 
If you have questions about these rules, please ask in the project's discussion forum or contact a maintainer.</content>
<parameter name="filePath">/home/panda/touch_grass/not_ilovepdf/rules.md -->