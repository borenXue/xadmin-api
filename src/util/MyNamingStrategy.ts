import { DefaultNamingStrategy } from 'typeorm';
import changeCase from 'change-case';

export default class MyNamingStrategy extends DefaultNamingStrategy {
  name = 'MyNamingStrategy'

  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    if (userSpecifiedName) return userSpecifiedName;
    return changeCase.snakeCase(targetName).replace(/_entity$/, '');
  }

  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    if (embeddedPrefixes.length) {
      return changeCase.camelCase(embeddedPrefixes.join('_')) + (customName ? changeCase.titleCase(customName) : changeCase.titleCase(propertyName));
    }
    if (customName) return customName;
    if (propertyName === 'deleted') return 'is_deleted';
    if (propertyName === 'enable') return 'is_enable';
    return changeCase.snakeCase(propertyName);
  }
}
