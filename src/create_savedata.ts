import { writeFileSync } from 'fs';

const data = [
    {
        meta: {
            id: "12345",
            name: "username",
            created_at: "2023-01-01T00:00:00Z",
            updated_at: "2023-01-01T00:00:00Z",
        },
        data: {}
    }
]

writeFileSync("userdata/tonton", JSON.stringify(data, null, 2), "utf-8");
console.log('✅ tontonのjsonを作成しました');