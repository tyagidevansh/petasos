
-- Folders
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Requests
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT DEFAULT '',
    body TEXT, -- JSON string or text
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Headers
CREATE TABLE headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE
);

-- Query Params
CREATE TABLE query_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE
);

-- Response Fields (Schema)
CREATE TABLE response_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    required BOOLEAN DEFAULT false,
    description TEXT,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE
);

-- Examples
CREATE TABLE examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status INTEGER NOT NULL,
    response_body TEXT, -- JSON string
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_requests_folder_id ON requests(folder_id);
CREATE INDEX idx_headers_request_id ON headers(request_id);
CREATE INDEX idx_query_params_request_id ON query_params(request_id);
CREATE INDEX idx_response_fields_request_id ON response_fields(request_id);
CREATE INDEX idx_examples_request_id ON examples(request_id);

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for now (mimicking "share with team" without auth)
-- Ideally, you'd replace this with authenticated policies later.
CREATE POLICY "Allow public read access" ON folders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON folders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON folders FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON requests FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON requests FOR DELETE USING (true);

-- Repeat for related tables (simplified here, in reality applied to all)
CREATE POLICY "Allow public access" ON headers FOR ALL USING (true);
CREATE POLICY "Allow public access" ON query_params FOR ALL USING (true);
CREATE POLICY "Allow public access" ON response_fields FOR ALL USING (true);
CREATE POLICY "Allow public access" ON examples FOR ALL USING (true);
