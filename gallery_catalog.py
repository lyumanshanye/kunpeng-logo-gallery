"""Apply reviewed gallery consolidations without deleting original artwork."""
from collections import Counter


def apply_deduplication(data, report):
    redirects = {entry['remove']: entry['keep'] for entry in report['duplicates']}
    assert len(redirects) == len(report['duplicates'])
    assert not (set(report.get('protected', [])) & redirects.keys())
    visible = [item for item in data['items'] if item['id'] not in redirects]
    visible_ids = {item['id'] for item in visible}
    assert all(target in visible_ids for target in redirects.values())
    assert all(item_id in visible_ids for item_id in report.get('protected', []))
    counts = Counter(item['batch'] for item in visible)
    descriptions = report.get('batch_descriptions', {})
    data['items'] = visible
    data['total'] = len(visible)
    data['batches'] = [dict(batch, count=counts[batch['id']],
        description=descriptions.get(batch['id'], batch['description']))
        for batch in data['batches'] if counts[batch['id']]]
    used_references = {item['reference'] for item in visible if item.get('reference')}
    data['references'] = {key: value for key, value in data['references'].items()
                          if key in used_references}
    data['duplicateMap'] = {**data.get('duplicateMap', {}), **redirects}
    return data
