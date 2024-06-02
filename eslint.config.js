import typescriptEslint from "typescript-eslint"
import prettier from "eslint-config-prettier"

export default typescriptEslint.config(
  prettier,
  ...typescriptEslint.configs.recommended,
  ...typescriptEslint.configs.strict,
  {
    files: ["**/*.ts"],
    plugins: { typescriptEslint },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/member-delimiter-style": [
        "warn",
        { multiline: { delimiter: "none" } }
      ]
    },
  }
)
